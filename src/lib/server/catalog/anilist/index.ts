import { stripHtml } from '$lib/format';
import type { Item, ItemDetail, Release, ResultPage } from '$lib/types';
import type { Catalog } from '../types';
import { NotFound, query } from './client';
import { DETAIL, HOME, POPULAR, SEARCH } from './queries';
import { currentSeason } from './season';

// AniList → Nuba. Everything AniList-specific stays in this folder.

interface Media {
	id: number;
	title: { romaji: string | null; english: string | null; native: string | null };
	coverImage: { medium?: string | null; large: string | null; extraLarge?: string | null; color: string | null };
	bannerImage?: string | null;
	format: string | null;
	episodes: number | null;
	seasonYear?: number | null;
	startDate?: { year: number | null };
	averageScore?: number | null;
	genres?: string[];
	description?: string | null;
}

interface MediaDetail extends Media {
	siteUrl: string;
	isAdult: boolean;
	duration: number | null;
	status: string | null;
	season: string | null;
	studios: { nodes: { name: string }[] };
	nextAiringEpisode: { episode: number; airingAt: number } | null;
	externalLinks: { site: string; url: string; type: string | null; color: string | null; language: string | null }[];
	recommendations: { nodes: { mediaRecommendation: Media | null }[] };
}

interface Airing {
	id: number;
	episode: number;
	airingAt: number;
	media: Media & { isAdult: boolean };
}

type Page<T> = { media?: T[]; airingSchedules?: T[] };

const FORMATS: Record<string, string> = {
	TV: 'TV',
	TV_SHORT: 'TV Short',
	MOVIE: 'Movie',
	SPECIAL: 'Special',
	OVA: 'OVA',
	ONA: 'ONA',
	MUSIC: 'Music'
};

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
		total: m.episodes
	};
}

async function page(q: string, variables: Record<string, unknown>, ttl?: number): Promise<ResultPage> {
	const data = await query<{ Page: { pageInfo: { hasNextPage: boolean }; media: Media[] } }>(q, variables, ttl);
	return { items: data.Page.media.map((m) => toItem(m)), hasNext: data.Page.pageInfo.hasNextPage };
}

export const anilist: Catalog = {
	name: 'AniList',
	url: 'https://anilist.co',
	imageHosts: ['s4.anilist.co', 'img.anili.st'],

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

	search: (search, p) => page(SEARCH, { search, page: p }),

	browse: (p) => page(POPULAR, { page: p }, 30 * 60_000),

	async item(id) {
		if (!/^\d{1,9}$/.test(id)) return null;

		let m: MediaDetail;
		try {
			({ Media: m } = await query<{ Media: MediaDetail }>(DETAIL, { id: Number(id) }, 15 * 60_000));
		} catch (e) {
			if (e instanceof NotFound) return null;
			throw e;
		}
		if (m.isAdult) return null;

		const item = toItem(m);
		const facts = [
			['Format', item.kind],
			['Episodes', m.episodes],
			['Duration', m.duration && `${m.duration} min`],
			['Status', humanize(m.status)],
			['Season', m.season && `${humanize(m.season)} ${m.seasonYear ?? ''}`.trim()],
			['Studio', m.studios.nodes.map((s) => s.name).join(', ')]
		]
			.filter(([, value]) => value)
			.map(([label, value]) => ({ label: String(label), value: String(value) }));

		const detail: ItemDetail = {
			...item,
			summary: stripHtml(m.description ?? null),
			facts,
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
