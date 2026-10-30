const CARD = `
fragment card on Media {
	id
	title { romaji english native }
	coverImage { large extraLarge color }
	bannerImage
	format
	episodes
	isAdult
	popularity
	seasonYear
	startDate { year }
	averageScore
	genres
	description(asHtml: false)
}`;

const SCHEDULE_FIELDS = `
	airingSchedules(airingAt_greater: $from, airingAt_lesser: $to, sort: TIME) {
		id episode airingAt
		media { id isAdult format episodes title { romaji english native } coverImage { medium large color } }
	}`;

export const HOME = `
query Home($season: MediaSeason, $year: Int, $from: Int, $to: Int) {
	trending: Page(perPage: 20) { media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ...card } }
	season: Page(perPage: 20) {
		media(season: $season, seasonYear: $year, sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ...card }
	}
	top: Page(perPage: 10) {
		media(season: $season, seasonYear: $year, sort: SCORE_DESC, type: ANIME, isAdult: false, popularity_greater: 5000) { ...card }
	}
	s1: Page(page: 1, perPage: 50) { ${SCHEDULE_FIELDS} }
	s2: Page(page: 2, perPage: 50) { ${SCHEDULE_FIELDS} }
	s3: Page(page: 3, perPage: 50) { ${SCHEDULE_FIELDS} }
	s4: Page(page: 4, perPage: 50) { ${SCHEDULE_FIELDS} }
}
${CARD}`;

const FILTER_ARGS = `type: ANIME, isAdult: $adult, format_in: $format, seasonYear: $year, season: $season, status: $status, genre_in: $genres, tag_in: $tags`;

/**
 * One request that runs the search itself plus a few looser spellings of it
 * (see search.ts), so typos and partial titles still find things without
 * spending more of the rate limit.
 */
export function searchQuery(variants: number) {
	const vars = Array.from({ length: variants }, (_, i) => `, $v${i}: String`).join('');
	const extra = Array.from(
		{ length: variants },
		(_, i) => `v${i}: Page(perPage: 20) { media(search: $v${i}, ${FILTER_ARGS}, sort: POPULARITY_DESC) { ...card } }`
	).join('\n\t');
	return `
query Search($search: String, $page: Int, $sort: [MediaSort], $adult: Boolean, $format: [MediaFormat], $year: Int, $season: MediaSeason, $status: MediaStatus, $genres: [String], $tags: [String]${vars}) {
	main: Page(page: $page, perPage: 30) {
		pageInfo { total hasNextPage }
		media(search: $search, ${FILTER_ARGS}, sort: $sort) { ...card }
	}
	${extra}
}
${CARD}`;
}

export const DETAIL = `
query Detail($id: Int) {
	Media(id: $id, type: ANIME) {
		...card
		siteUrl
		isAdult
		duration
		status
		season
		studios(isMain: true) { nodes { name } }
		tags { name rank isMediaSpoiler isAdult }
		source
		favourites
		startDate { year month day }
		endDate { year month day }
		nextAiringEpisode { episode airingAt }
		externalLinks { site url type color language }
		recommendations(perPage: 14, sort: RATING_DESC) {
			nodes { mediaRecommendation { ...card } }
		}
	}
}
${CARD}`;
