import { stripHtml } from '$lib/format';
import type { Item, ItemDetail, Release, ResultPage } from '$lib/types';
import type { Catalog } from '../types';
import { NotFound, query } from './client';
import { DETAIL, HOME, searchQuery } from './queries';
import { crawlerStatus, resyncTitles, startCrawler, titles } from './crawl';
import { FORMATS } from './format';
import { SORTS, allFilters, filterVariables, sortVariable, variants } from './search';
import { currentSeason } from './season';

// AniList → Nuba. Everything AniList-specific stays in this folder.

interface Media {
	id: number;
	title: { romaji: string | null; english: string | null; native: string | null };
	coverImage: { medium?: string | null; large: string | null; extraLarge?: string | null; color: string | null };
	bannerImage?: string | null;
	format: string | null;
	episodes: number | null;
	isAdult?: boolean;
	popularity?: number | null;
	seasonYear?: number | null;
	startDate?: { year: number | null };
	averageScore?: number | null;
	genres?: string[];
	description?: string | null;
}

type FuzzyDate = { year: number | null; month?: number | null; day?: number | null };

const fuzzyDate = (d: FuzzyDate) =>
	d.year ? [d.year, d.month, d.day].filter(Boolean).join('-') : null;

interface MediaDetail extends Media {
	siteUrl: string;
	duration: number | null;
	status: string | null;
	season: string | null;
	studios: { nodes: { name: string }[] };
	tags: { name: string; rank: number; isMediaSpoiler: boolean; isAdult: boolean }[];
	source: string | null;
	favourites: number | null;
	startDate: FuzzyDate;
	endDate: FuzzyDate;
	nextAiringEpisode: { episode: number; airingAt: number } | null;
	externalLinks: { site: string; url: string; type: string | null; color: string | null; language: string | null }[];
	recommendations: { nodes: { mediaRecommendation: Media | null }[] };
}

interface Airing {
	id: number;
	episode: number;
	airingAt: number;
	media: Media;
}

type Page<T> = { media?: T[]; airingSchedules?: T[] };


const humanize = (value: string | null) =>
	value ? value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ') : '';

function toItem(m: Media, summaryMax = 0): Item {
	const { english, romaji, native } = m.title;
	return {
		id: String(m.id),
		title: english ?? romaji ?? native ?? 'Untitled',
		altTitles: {
			...(english && { english }),
			...(romaji && { romaji }),
			...(native && { native })
		},
		cover: m.coverImage.large,
		coverLarge: m.coverImage.extraLarge ?? m.coverImage.large,
		color: m.coverImage.color,
		banner: m.bannerImage ?? null,
		kind: m.format ? (FORMATS[m.format] ?? m.format) : null,
		year: m.seasonYear ?? m.startDate?.year ?? null,
		score: m.averageScore ? m.averageScore / 10 : null,
		tags: m.genres ?? [],
		summary: summaryMax ? stripHtml(m.description ?? null, summaryMax) : null,
		total: m.episodes,
		...(m.isAdult && { adult: true })
	};
}

type SearchResult = { main: { pageInfo: { total: number; hasNextPage: boolean }; media: Media[] } } & Record<
	string,
	{ media: Media[] }
>;

const PER_PAGE = 30;

const LOCAL_SORTS: Record<string, 'popularity' | 'score' | 'newest' | 'title'> = {
	POPULARITY_DESC: 'popularity',
	TRENDING_DESC: 'popularity',
	SCORE_DESC: 'score',
	START_DATE_DESC: 'newest',
	TITLE_ROMAJI: 'title'
};

export const anilist: Catalog = {
	name: 'AniList',
	url: 'https://anilist.co',
	imageHosts: ['s4.anilist.co', 'img.anili.st'],
	get filters() {
		return allFilters();
	},
	sorts: SORTS,
	start: startCrawler,
	status: crawlerStatus,
	resync: resyncTitles,

	async home() {
		const now = Math.floor(Date.now() / 1000);
		// Round the schedule window to the hour so the query (and its cache key) is stable.
		const hour = now - (now % 3600);
		const { season, year, label } = currentSeason();

		const data = await query<Record<'trending' | 'season' | 'top', Page<Media>> & Record<'s1' | 's2' | 's3' | 's4', Page<Airing>>>(
			HOME,
			{ season, year, from: hour - 86400, to: hour + 8 * 86400 }
		);

		const trending = data.trending.media ?? [];
		const schedule: Release[] = [data.s1, data.s2, data.s3, data.s4]
			.flatMap((p) => p.airingSchedules ?? [])
			.filter((a, i, all) => !a.media.isAdult && all.findIndex((b) => b.id === a.id) === i)
			.map((a) => ({
				id: String(a.id),
				unit: a.episode,
				at: a.airingAt,
				item: { ...toItem(a.media), cover: a.media.coverImage.medium ?? a.media.coverImage.large }
			}));

		return {
			hero: trending.filter((m) => m.bannerImage).slice(0, 8).map((m) => toItem(m, 260)),
			rows: [
				{ title: 'Trending Now', items: trending.map((m) => toItem(m)) },
				{ title: 'Airing This Season', items: (data.season.media ?? []).map((m) => toItem(m)) }
			],
			ranked: { title: `Top of ${label}`, items: (data.top.media ?? []).map((m) => toItem(m)) },
			schedule
		};
	},

	async search(q) {
		// Text searches use the local title index once it's built: typo-tolerant,
		// instant, and free of the rate limit. So do Studio, which AniList's
		// search can't filter by, and Tags, where every picked tag must match.
		const local = q.text || q.filters.studio?.length || q.filters.tag?.length;
		if (local && titles.getState<{ ready?: boolean }>()?.ready) {
			const all = titles.search({
				text: q.text,
				filters: q.filters,
				multi: new Set(allFilters().filter((f) => f.multi).map((f) => f.key)),
				adult: q.adult,
				sort: LOCAL_SORTS[q.sort] ?? 'relevance'
			});
			const from = (q.page - 1) * PER_PAGE;
			return { items: all.slice(from, from + PER_PAGE), hasNext: all.length > from + PER_PAGE, total: all.length };
		}

		// Looser spellings only make sense on the first page of a text search.
		const loose = q.text && q.page === 1 ? variants(q.text) : [];
		const variables: Record<string, unknown> = {
			...filterVariables(q),
			...(q.text && { search: q.text }),
			page: q.page,
			sort: sortVariable(q)
		};
		loose.forEach((v, i) => (variables[`v${i}`] = v));

		const data = await query<SearchResult>(searchQuery(loose.length), variables, q.text ? undefined : 30 * 60_000);
		const main = data.main.media;

		// Extra matches go after the exact ones: those found by more spellings
		// first, then the more popular.
		const seen = new Set(main.map((m) => m.id));
		const hits = new Map<number, { media: Media; count: number }>();
		for (let i = 0; i < loose.length; i++) {
			for (const m of data[`v${i}`]?.media ?? []) {
				if (seen.has(m.id)) continue;
				const hit = hits.get(m.id);
				if (hit) hit.count++;
				else hits.set(m.id, { media: m, count: 1 });
			}
		}
		const extra = [...hits.values()]
			.sort((a, b) => b.count - a.count || (b.media.popularity ?? 0) - (a.media.popularity ?? 0))
			.map((h) => h.media);

		return {
			items: [...main, ...extra].map((m) => toItem(m)),
			hasNext: data.main.pageInfo.hasNextPage,
			// AniList's own total is capped and unreliable past one page, so only
			// count when everything is on this page.
			total: data.main.pageInfo.hasNextPage ? null : (q.page - 1) * 30 + main.length + extra.length
		};
	},

	async item(id) {
		if (!/^\d{1,9}$/.test(id)) return null;

		let m: MediaDetail;
		try {
			({ Media: m } = await query<{ Media: MediaDetail }>(DETAIL, { id: Number(id) }, 15 * 60_000));
		} catch (e) {
			if (e instanceof NotFound) return null;
			throw e;
		}

		const item = toItem(m);
		const start = fuzzyDate(m.startDate);
		const end = fuzzyDate(m.endDate);
		const facts: ItemDetail['facts'] = [
			{ label: 'Format', value: item.kind, filter: m.format && { key: 'format', value: m.format } },
			{ label: 'Episodes', value: m.episodes },
			{ label: 'Duration', value: m.duration && `${m.duration} min` },
			{ label: 'Status', value: humanize(m.status), filter: m.status && { key: 'status', value: m.status } },
			{ label: 'Aired', value: start && (end && end !== start ? `${start} → ${end}` : start) },
			{
				label: 'Season',
				value: m.season && `${humanize(m.season)} ${m.seasonYear ?? ''}`.trim(),
				filter: m.seasonYear ? { key: 'year', value: String(m.seasonYear) } : null
			},
			{ label: 'Source', value: humanize(m.source) },
			{ label: 'Favourites', value: m.favourites?.toLocaleString('en') }
		]
			.filter((f) => f.value)
			.map((f) => ({ label: f.label, value: String(f.value), ...(f.filter && { filter: f.filter }) }));

		const detail: ItemDetail = {
			...item,
			summary: stripHtml(m.description ?? null),
			facts,
			tagFilter: 'genre',
			// Adult descriptors only make sense on adult titles.
			keywords: m.tags
				.filter((t) => m.isAdult || !t.isAdult)
				.map((t) => ({ name: t.name, weight: t.rank, spoiler: t.isMediaSpoiler })),
			keywordFilter: 'tag',
			makers: m.studios.nodes.length
				? { label: m.studios.nodes.length > 1 ? 'Studios' : 'Studio', names: m.studios.nodes.map((s) => s.name), filter: 'studio' }
				: null,
			links: m.externalLinks
				.filter((l) => l.type === 'STREAMING')
				.map((l) => ({ label: l.language ? `${l.site} (${l.language})` : l.site, url: l.url, color: l.color })),
			next: m.nextAiringEpisode && { unit: m.nextAiringEpisode.episode, at: m.nextAiringEpisode.airingAt },
			related: m.recommendations.nodes.flatMap((n) => (n.mediaRecommendation ? [toItem(n.mediaRecommendation)] : [])),
			sourceUrl: m.siteUrl
		};
		return detail;
	}
};
