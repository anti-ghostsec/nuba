import { TitleIndex, type IndexRecord } from '$lib/server/title-index';
import { CatalogUnavailable } from '../types';
import { budget, request } from './client';
import { FORMATS } from './format';

// Keeps a local copy of every AniList anime title, so search can be fuzzy
// and doesn't spend the rate limit. A first full pass (~50 requests of up to
// 500 titles), then a check for changed titles every half hour. It always
// leaves most of the rate limit for visitors.

export const titles = new TitleIndex('anilist');

const FIELDS = `id updatedAt isAdult popularity format status season seasonYear startDate { year } episodes
	averageScore genres synonyms title { romaji english native } coverImage { large extraLarge color }
	studios(isMain: true) { nodes { name } } tags { name isAdult }`;

/** Bump when FIELDS or toRecord change, to refetch everything in the background. */
const VERSION = 3;

/** Ten pages of 50 per request: AniList counts requests, not titles. */
const PAGES = 10;
const PER_PAGE = 50;

/**
 * AniList won't page past 5,000 results of one query, so the full pass goes
 * slice by slice: titles not yet dated, then by start year (old decades
 * together), each well under that.
 */
function slices(): string[] {
	const date = (from: number, to: number) => `startDate_greater: ${from - 1}9999, startDate_lesser: ${to + 1}0000`;
	const last = new Date().getFullYear() + 5;
	const out = ['status: NOT_YET_RELEASED', date(1900, 1959), date(1960, 1979), date(1980, 1989)];
	for (let y = 1990; y <= last; y++) out.push(date(y, y));
	return out;
}

const sliceQuery = (filter: string, firstPage: number) =>
	`{${Array.from(
		{ length: PAGES },
		(_, i) =>
			`p${i}: Page(page: ${firstPage + i}, perPage: ${PER_PAGE}) { media(type: ANIME, sort: ID, ${filter}) { ${FIELDS} } }`
	).join('\n')}}`;

const recentQuery = (page: number) =>
	`{${Array.from(
		{ length: 2 },
		(_, i) => `p${i}: Page(page: ${page + i}, perPage: ${PER_PAGE}) { media(type: ANIME, sort: UPDATED_AT_DESC) { ${FIELDS} } }`
	).join('\n')}}`;

interface Raw {
	id: number;
	updatedAt: number;
	isAdult: boolean;
	popularity: number | null;
	format: string | null;
	status: string | null;
	season: string | null;
	seasonYear: number | null;
	startDate: { year: number | null };
	episodes: number | null;
	averageScore: number | null;
	genres: string[];
	synonyms: string[];
	title: { romaji: string | null; english: string | null; native: string | null };
	coverImage: { large: string | null; extraLarge: string | null; color: string | null };
	studios: { nodes: { name: string }[] };
	tags: { name: string; isAdult: boolean }[];
}

interface State {
	version: number;
	/** A full pass has finished at some point, so the index can answer searches. */
	ready: boolean;
	/** Progress through the first full pass: which slice, and its next page. */
	slice: number;
	page: number;
	complete: boolean;
	/** Newest updatedAt seen, for the incremental checks. */
	updatedAt: number;
}

function toRecord(m: Raw): IndexRecord {
	const { english, romaji, native } = m.title;
	const year = m.seasonYear ?? m.startDate.year;
	return {
		id: String(m.id),
		item: {
			id: String(m.id),
			title: english ?? romaji ?? native ?? 'Untitled',
			altTitles: { ...(english && { english }), ...(romaji && { romaji }), ...(native && { native }) },
			cover: m.coverImage.large,
			coverLarge: m.coverImage.extraLarge ?? m.coverImage.large,
			color: m.coverImage.color,
			banner: null,
			kind: m.format ? (FORMATS[m.format] ?? m.format) : null,
			year,
			score: m.averageScore ? m.averageScore / 10 : null,
			tags: m.genres,
			summary: null,
			total: m.episodes,
			...(m.isAdult && { adult: true })
		},
		names: [english, romaji, native, ...m.synonyms].filter((n): n is string => !!n),
		facets: {
			format: m.format ? [m.format] : [],
			year: year ? [String(year)] : [],
			season: m.season ? [m.season] : [],
			status: m.status ? [m.status] : [],
			genre: m.genres,
			studio: m.studios.nodes.map((s) => s.name),
			// Every tag AniList lists, as AniList's own tag filter does. Adult
			// descriptors only on adult titles, which keeps them out of the menu.
			tag: m.tags.filter((t) => m.isAdult || !t.isAdult).map((t) => t.name)
		},
		popularity: m.popularity ?? 0
	};
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until there's rate limit to spare, keeping 12 requests a minute for visitors. */
async function politely() {
	await sleep(3000);
	while (budget.remaining < 12 || Date.now() < budget.resetAt) {
		await sleep(Math.max(budget.resetAt - Date.now(), 20_000));
		budget.remaining = Math.max(budget.remaining, 12);
	}
}

async function fetchPages(query: string, variables: Record<string, unknown> = {}): Promise<Raw[]> {
	const data = await request<Record<string, { media: Raw[] }>>(query, variables);
	return Object.keys(data)
		.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))
		.flatMap((k) => data[k].media);
}

async function step(state: State): Promise<'more' | 'idle'> {
	if (!state.complete) {
		const all = slices();
		const media = await fetchPages(sliceQuery(all[state.slice], state.page));
		titles.upsert(media.map(toRecord));
		state.updatedAt = media.reduce((max, m) => Math.max(max, m.updatedAt), state.updatedAt);
		if (media.length < PAGES * PER_PAGE) {
			state.slice++;
			state.page = 1;
		} else {
			state.page += PAGES;
		}
		if (state.slice >= all.length) {
			state.complete = true;
			state.ready = true;
			console.log(`Title index ready: ${titles.size} titles.`);
		}
		titles.setState(state);
		return state.complete ? 'idle' : 'more';
	}

	// Recently changed titles, newest first, until we reach ones we already have.
	let newest = state.updatedAt;
	for (let page = 1; page <= 20; page += 2) {
		const media = await fetchPages(recentQuery(page));
		const fresh = media.filter((m) => m.updatedAt > state.updatedAt);
		titles.upsert(fresh.map(toRecord));
		newest = Math.max(newest, ...fresh.map((m) => m.updatedAt));
		if (fresh.length < media.length || media.length < 2 * PER_PAGE) break;
		await politely();
	}
	state.updatedAt = newest;
	titles.setState(state);
	return 'idle';
}

// Shared through globalThis so the dev server's hot reloads keep talking to
// the one running loop.
interface Crawler {
	state: State | null;
	error: string | null;
	wake: () => void;
}
const crawler = ((globalThis as { __nubaCrawler?: Crawler }).__nubaCrawler ??= {
	state: null,
	error: null,
	wake: () => {}
});
let started = !!crawler.state;

/** Starts the background sync once per server process. */
export function startCrawler() {
	if (started) return;
	started = true;

	(async () => {
		const saved = titles.getState<Partial<State>>();
		let state: State = { version: 1, ready: false, slice: 0, page: 1, complete: false, updatedAt: 0, ...saved };
		if (state.version !== VERSION) {
			// Refetch everything, still answering searches from the old copy meanwhile.
			state = { ...state, version: VERSION, ready: !!saved?.complete || !!saved?.ready, slice: 0, page: 1, complete: false };
			titles.setState(state);
		}
		crawler.state = state;
		if (!state.complete) console.log(`Building title index from AniList (${titles.size} so far)…`);
		for (;;) {
			try {
				await politely();
				const result = await step(state);
				crawler.error = null;
				if (result === 'idle') await new Promise<void>((r) => ((crawler.wake = r), setTimeout(r, 30 * 60_000)));
			} catch (e) {
				crawler.error = e instanceof Error ? e.message : String(e);
				console.error('Title index sync failed:', e instanceof CatalogUnavailable ? e.message : e);
				await sleep(60_000);
			}
		}
	})();
}

/** For the admin page. */
export function crawlerStatus(): { label: string; value: string }[] {
	const state = crawler.state ?? titles.getState<State>();
	const progress = !state
		? 'Not started'
		: state.complete
			? 'Up to date'
			: `Downloading (part ${state.slice + 1} of ${slices().length})`;
	return [
		{ label: 'Titles in search index', value: titles.size.toLocaleString('en') },
		{ label: 'Index', value: progress },
		{ label: 'Last change seen', value: state?.updatedAt ? new Date(state.updatedAt * 1000).toUTCString() : '—' },
		{ label: 'AniList requests left this minute', value: String(budget.remaining) },
		...(crawler.error ? [{ label: 'Last sync error', value: crawler.error }] : [])
	];
}

/** Download every title again (search keeps using the current copy meanwhile). */
export function resyncTitles() {
	const state = crawler.state;
	if (!state) return;
	Object.assign(state, { slice: 0, page: 1, complete: false });
	titles.setState(state);
	crawler.wake();
}
