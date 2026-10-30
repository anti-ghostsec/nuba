import type { Filter, Option, SearchQuery } from '$lib/types';

// Search filters and the "loose spelling" variants AniList is queried with.

const opts = (pairs: [string, string][]): Option[] => pairs.map(([value, label]) => ({ value, label }));

const thisYear = new Date().getFullYear();

export const FILTERS: Filter[] = [
	{
		key: 'format',
		label: 'Format',
		options: opts([
			['TV', 'TV'],
			['TV_SHORT', 'TV Short'],
			['MOVIE', 'Movie'],
			['SPECIAL', 'Special'],
			['OVA', 'OVA'],
			['ONA', 'ONA'],
			['MUSIC', 'Music']
		])
	},
	{
		key: 'year',
		label: 'Year',
		options: Array.from({ length: thisYear + 2 - 1940 }, (_, i) => String(thisYear + 1 - i)).map((y) => ({
			value: y,
			label: y
		}))
	},
	{
		key: 'season',
		label: 'Season',
		options: opts([
			['WINTER', 'Winter'],
			['SPRING', 'Spring'],
			['SUMMER', 'Summer'],
			['FALL', 'Fall']
		])
	},
	{
		key: 'status',
		label: 'Status',
		options: opts([
			['RELEASING', 'Airing'],
			['FINISHED', 'Finished'],
			['NOT_YET_RELEASED', 'Upcoming'],
			['HIATUS', 'On hiatus'],
			['CANCELLED', 'Cancelled']
		])
	},
	{
		key: 'genre',
		label: 'Genre',
		multi: true,
		options: [
			'Action',
			'Adventure',
			'Comedy',
			'Drama',
			'Ecchi',
			'Fantasy',
			'Horror',
			'Mahou Shoujo',
			'Mecha',
			'Music',
			'Mystery',
			'Psychological',
			'Romance',
			'Sci-Fi',
			'Slice of Life',
			'Sports',
			'Supernatural',
			'Thriller'
		].map((g) => ({ value: g, label: g }))
	}
];

export const SORTS: Option[] = opts([
	['POPULARITY_DESC', 'Popular'],
	['TRENDING_DESC', 'Trending'],
	['SCORE_DESC', 'Score'],
	['START_DATE_DESC', 'Newest'],
	['TITLE_ROMAJI', 'Title (A–Z)']
]);

const STOPWORDS = new Set(['the', 'and', 'with', 'from', 'that', 'this', 'season', 'part', 'movie']);

/**
 * Looser spellings of a search, so "ranman" also finds Ranma and
 * "attack titan" finds things with either word. AniList's own search only
 * matches whole words as typed.
 */
export function variants(text: string, max = 10): string[] {
	const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
	const out = new Set<string>();
	const words = t.split(' ').filter((w) => w.length >= 4 && !STOPWORDS.has(w));

	if (words.length > 1) for (const w of words) out.add(w);

	// One typo in the longest word: an extra letter ("ranman" → "ranma") or two
	// letters swapped ("peice" → "piece"). The last letter goes first.
	const word = words.toSorted((a, b) => b.length - a.length)[0];
	if (word && word.length <= 24) {
		out.add(word.slice(0, -1));
		for (let i = 0; i < word.length - 1; i++) out.add(word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2));
		for (let i = word.length - 2; i >= 0; i--) out.add(word.slice(0, i) + word.slice(i + 1));
	}
	out.delete(t);
	return [...out].filter((v) => v.replace(/\W/g, '').length >= 3).slice(0, max);
}

/** GraphQL variables for the filters, ignoring any value not on the list. */
export function filterVariables(query: SearchQuery) {
	const pick = (key: string) => {
		const allowed = FILTERS.find((f) => f.key === key)!.options;
		return (query.filters[key] ?? []).filter((v) => allowed.some((o) => o.value === v));
	};
	const [format, year, season, status] = ['format', 'year', 'season', 'status'].map((k) => pick(k)[0]);
	const genres = pick('genre');

	// Unused filters must be left out entirely: AniList treats an explicit
	// null as a value (null isAdult matches nothing, null lists error out).
	return {
		...(!query.adult && { adult: false }),
		...(format && { format: [format] }),
		...(year && { year: Number(year) }),
		...(season && { season }),
		...(status && { status }),
		...(genres.length && { genres })
	};
}

export function sortVariable(query: SearchQuery): string[] {
	if (SORTS.some((s) => s.value === query.sort)) return [query.sort];
	return query.text ? ['SEARCH_MATCH', 'POPULARITY_DESC'] : ['POPULARITY_DESC'];
}
