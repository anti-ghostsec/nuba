import type { Item } from '$lib/types';
import { getDb } from './db';

// A local copy of a catalog's titles, for fast typo-tolerant search that
// doesn't spend the catalog's rate limit. Catalog-agnostic: an adapter fills
// it with records and asks it questions. Kept in SQLite, searched in memory.

export interface IndexRecord {
	id: string;
	/** The card shown in results. */
	item: Item;
	/** Every name the item goes by: titles in each language, synonyms… */
	names: string[];
	/** Filterable values, keyed like the catalog's filters (format, genre…). */
	facets: Record<string, string[]>;
	popularity: number;
}

export interface IndexQuery {
	text: string;
	filters: Record<string, string[]>;
	/** Which filters accept several values that must all match. */
	multi: Set<string>;
	adult: boolean;
	sort: 'relevance' | 'popularity' | 'score' | 'newest' | 'title';
}

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'on', 'no', 'to', 'and', 'wa', 'ga', 'wo', 'ni']);

/** Lowercase, no accents, punctuation as spaces: "Ranma ½!" → "ranma 1 2". */
export const normalize = (s: string) =>
	s
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();

const hasCJK = (s: string) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(s);

/** Edit distance counting a swap of neighbours as one edit, giving up past max. */
function distance(a: string, b: string, max: number): number {
	if (Math.abs(a.length - b.length) > max) return max + 1;
	const rows: number[][] = [Array.from({ length: b.length + 1 }, (_, j) => j)];
	for (let i = 1; i <= a.length; i++) {
		const row = [i];
		let best = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			let v = Math.min(rows[i - 1][j] + 1, row[j - 1] + 1, rows[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, rows[i - 2][j - 2] + 1);
			row.push(v);
			best = Math.min(best, v);
		}
		if (best > max) return max + 1;
		rows.push(row);
	}
	return rows[a.length][b.length];
}

const allowedTypos = (len: number) => (len < 4 ? 0 : len < 6 ? 1 : len < 9 ? 2 : 3);

/** How well one typed word matches one word of a name, 0–1. */
function wordScore(typed: string, word: string): number {
	if (word === typed) return 1;
	if (word.startsWith(typed)) return typed.length >= 3 ? 0.9 : 0.7;
	const max = allowedTypos(typed.length);
	if (!max) return 0;
	const d = distance(typed, word, max);
	if (d <= max) return 0.85 - 0.15 * d;
	// Still typing a long word with a typo in it: "frier" → "frieren".
	if (typed.length >= 5 && word.length > typed.length && distance(typed, word.slice(0, typed.length), 1) <= 1) return 0.5;
	return 0;
}

interface Entry {
	record: IndexRecord;
	/** Normalized names, for whole-phrase and CJK matching. */
	flat: string[];
}

export class TitleIndex {
	private entries = new Map<string, Entry>();
	/** Every distinct word in any name → the items that use it. */
	private words = new Map<string, Set<string>>();
	private cache = new Map<string, { id: string; score: number }[]>();
	private loaded = false;

	constructor(private catalog: string) {}

	private load() {
		if (this.loaded) return;
		this.loaded = true;
		const rows = getDb().prepare('SELECT record FROM title_index WHERE catalog = ?').all(this.catalog) as {
			record: string;
		}[];
		for (const { record } of rows) this.add(JSON.parse(record));
	}

	private add(record: IndexRecord) {
		this.remove(record.id);
		const flat = [...new Set(record.names.map(normalize).filter(Boolean))];
		this.entries.set(record.id, { record, flat });
		for (const name of flat) {
			for (const w of name.split(' ')) {
				let ids = this.words.get(w);
				if (!ids) this.words.set(w, (ids = new Set()));
				ids.add(record.id);
			}
		}
	}

	private remove(id: string) {
		const old = this.entries.get(id);
		if (!old) return;
		for (const name of old.flat) {
			for (const w of name.split(' ')) {
				const ids = this.words.get(w);
				ids?.delete(id);
				if (ids?.size === 0) this.words.delete(w);
			}
		}
		this.entries.delete(id);
	}

	get size() {
		this.load();
		return this.entries.size;
	}

	upsert(records: IndexRecord[]) {
		this.load();
		const insert = getDb().prepare(
			'INSERT INTO title_index (catalog, id, record) VALUES (?, ?, ?) ON CONFLICT (catalog, id) DO UPDATE SET record = excluded.record'
		);
		getDb().transaction(() => {
			for (const r of records) insert.run(this.catalog, r.id, JSON.stringify(r));
		})();
		for (const r of records) this.add(r);
		this.cache.clear();
	}

	/** Small JSON blob an adapter can keep its sync progress in. */
	getState<T>(): T | null {
		const row = getDb().prepare('SELECT state FROM title_index_state WHERE catalog = ?').get(this.catalog) as
			| { state: string }
			| undefined;
		return row ? JSON.parse(row.state) : null;
	}

	setState(state: unknown) {
		getDb()
			.prepare(
				'INSERT INTO title_index_state (catalog, state) VALUES (?, ?) ON CONFLICT (catalog) DO UPDATE SET state = excluded.state'
			)
			.run(this.catalog, JSON.stringify(state));
	}

	/** Every item matching the text, best first (before filters and sorting). */
	private match(text: string): { id: string; score: number }[] {
		const phrase = normalize(text);
		const cached = this.cache.get(phrase);
		if (cached) return cached;

		const scores = new Map<string, number>();

		if (hasCJK(phrase)) {
			// No spaces between words in Japanese, Chinese or Korean: match anywhere.
			const bare = phrase.replaceAll(' ', '');
			for (const [id, e] of this.entries) {
				if (e.flat.some((n) => n.replaceAll(' ', '').includes(bare))) scores.set(id, 1);
			}
		} else {
			let typed = phrase.split(' ').filter((w) => w && !STOPWORDS.has(w));
			if (!typed.length) typed = phrase.split(' ').filter(Boolean);
			if (!typed.length) return [];

			// Best score per item for each typed word.
			const perWord = typed.map((t) => {
				const best = new Map<string, number>();
				for (const [word, ids] of this.words) {
					const s = wordScore(t, word);
					if (!s) continue;
					for (const id of ids) if ((best.get(id) ?? 0) < s) best.set(id, s);
				}
				return best;
			});

			// Every word has to match, except one when there are three or more.
			const needed = typed.length >= 3 ? typed.length - 1 : typed.length;
			const candidates = new Set(perWord.flatMap((m) => [...m.keys()]));
			for (const id of candidates) {
				let total = 0;
				let hits = 0;
				for (const m of perWord) {
					const s = m.get(id);
					if (s) {
						total += s;
						hits++;
					}
				}
				if (hits < needed) continue;
				let score = total / typed.length;
				// The whole phrase as typed, in one name, beats scattered words.
				if (this.entries.get(id)!.flat.some((n) => ` ${n} `.includes(` ${phrase}`))) score += 0.5;
				scores.set(id, score);
			}
		}

		const ranked = [...scores].map(([id, score]) => ({ id, score }));
		this.cache.set(phrase, ranked);
		if (this.cache.size > 300) this.cache.delete(this.cache.keys().next().value!);
		return ranked;
	}

	search(q: IndexQuery): Item[] {
		this.load();
		const hits = this.match(q.text).filter(({ id }) => {
			const r = this.entries.get(id)!.record;
			if (r.item.adult && !q.adult) return false;
			for (const [key, values] of Object.entries(q.filters)) {
				if (!values.length) continue;
				const have = r.facets[key] ?? [];
				const ok = q.multi.has(key) ? values.every((v) => have.includes(v)) : values.some((v) => have.includes(v));
				if (!ok) return false;
			}
			return true;
		});

		const rec = (id: string) => this.entries.get(id)!.record;
		const byPopularity = (a: string, b: string) => rec(b).popularity - rec(a).popularity;
		const order: Record<IndexQuery['sort'], (a: { id: string; score: number }, b: { id: string; score: number }) => number> = {
			// Close matches in bands, then the better-known title first.
			relevance: (a, b) => Math.round(b.score * 10) - Math.round(a.score * 10) || byPopularity(a.id, b.id),
			popularity: (a, b) => byPopularity(a.id, b.id),
			score: (a, b) => (rec(b.id).item.score ?? 0) - (rec(a.id).item.score ?? 0),
			newest: (a, b) => (rec(b.id).item.year ?? 0) - (rec(a.id).item.year ?? 0) || byPopularity(a.id, b.id),
			title: (a, b) => rec(a.id).item.title.localeCompare(rec(b.id).item.title)
		};
		return hits.sort(order[q.sort]).map(({ id }) => rec(id).item);
	}
}
