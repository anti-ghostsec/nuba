import type { ListStatus } from './types';

// Every piece of wording that ties Nuba to anime lives here. To turn it into
// a book tracker or a store, change this file and swap the catalog
// (src/lib/server/catalog); the components only read from here.

export const SITE = {
	name: 'Nuba',
	tagline: 'Track and discover anime',
	description: 'A fast, privacy-friendly anime tracker.',
	searchPlaceholder: 'Search anime…',

	/** What one tracked unit is called: episode, chapter, issue… */
	unit: { one: 'Episode', many: 'Episodes', short: 'Ep' },

	/** Shown on the detail page above the item's outbound links. */
	linksTitle: 'Where to watch',
	noLinks: 'No official streaming services are listed yet.',

	/** Whether to offer the EN / Romaji / Native title switch. */
	titleLanguages: true,

	continueTitle: 'Continue Watching',
	listTitle: 'My list',

	statuses: {
		CURRENT: 'Watching',
		PLANNING: 'Plan to watch',
		COMPLETED: 'Completed',
		PAUSED: 'On hold',
		DROPPED: 'Dropped'
	} satisfies Record<ListStatus, string>
};

export const STATUSES = Object.keys(SITE.statuses) as ListStatus[];
