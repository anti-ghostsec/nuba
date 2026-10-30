const CARD = `
fragment card on Media {
	id
	title { romaji english native }
	coverImage { large extraLarge color }
	bannerImage
	format
	episodes
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

export const SEARCH = `
query Search($search: String, $page: Int) {
	Page(page: $page, perPage: 30) {
		pageInfo { hasNextPage }
		media(search: $search, type: ANIME, isAdult: false, sort: [SEARCH_MATCH, POPULARITY_DESC]) { ...card }
	}
}
${CARD}`;

export const POPULAR = `
query Popular($page: Int) {
	Page(page: $page, perPage: 30) {
		pageInfo { hasNextPage }
		media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) { ...card }
	}
}
${CARD}`;

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
		nextAiringEpisode { episode airingAt }
		externalLinks { site url type color language }
		recommendations(perPage: 14, sort: RATING_DESC) {
			nodes { mediaRecommendation { ...card } }
		}
	}
}
${CARD}`;
