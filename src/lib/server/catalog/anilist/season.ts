const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const;

/** AniList seasons: Winter = Jan–Mar, Spring = Apr–Jun, Summer = Jul–Sep, Fall = Oct–Dec. */
export function currentSeason(date = new Date()) {
	const season = SEASONS[Math.floor(date.getUTCMonth() / 3)];
	const year = date.getUTCFullYear();
	return { season, year, label: `${season.charAt(0)}${season.slice(1).toLowerCase()} ${year}` };
}
