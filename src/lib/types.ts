// Nuba's own data model. Catalogs (AniList today; books, games or a store
// tomorrow) translate their data into these shapes, and nothing outside
// src/lib/server/catalog knows where the data came from.

import type { TitleLang } from './prefs';

/** Anything that can be browsed and tracked: a show, a book, a product… */
export interface Item {
	id: string;
	title: string;
	/** Optional alternate titles, picked by the title-language preference. */
	altTitles: Partial<Record<TitleLang, string>>;
	cover: string | null;
	coverLarge: string | null;
	/** Dominant cover color, shown while the image loads. */
	color: string | null;
	banner: string | null;
	/** Short type label, e.g. "TV", "Movie", "Novel". */
	kind: string | null;
	year: number | null;
	/** 0–10 */
	score: number | null;
	tags: string[];
	summary: string | null;
	/** Total units (episodes, chapters…), if known. */
	total: number | null;
	/** Adult-only. Hidden unless a signed-in user has turned it on. */
	adult?: boolean;
}

export interface ItemDetail extends Item {
	facts: { label: string; value: string }[];
	/** Outbound links, e.g. official places to watch or buy. */
	links: { label: string; url: string; color: string | null }[];
	/** The next unit to be released, if the catalog knows. */
	next: { unit: number; at: number } | null;
	related: Item[];
	/** This item's page on the source site. */
	sourceUrl: string | null;
}

/** A unit (episode, chapter…) released at a given time. */
export interface Release {
	id: string;
	unit: number;
	at: number;
	item: Item;
}

export interface Shelf {
	title: string;
	items: Item[];
}

export interface HomeFeed {
	hero: Item[];
	rows: Shelf[];
	ranked: Shelf | null;
	schedule: Release[] | null;
}

export interface ResultPage {
	items: Item[];
	hasNext: boolean;
	/** Total matches, if the catalog knows. */
	total: number | null;
}

export interface Option {
	value: string;
	label: string;
}

/** A search filter a catalog offers, e.g. Format, Year or Genre. */
export interface Filter {
	key: string;
	label: string;
	options: Option[];
	/** Several values can be picked; an item must have all of them. */
	multi?: boolean;
	/** Long list: shown as chips when short, or a dropdown with a search box when `picker`. */
	picker?: boolean;
}

export interface SearchQuery {
	text: string;
	page: number;
	/** Selected values, keyed by Filter.key. */
	filters: Record<string, string[]>;
	/** One of the catalog's sort values, or '' for its default. */
	sort: string;
	adult: boolean;
}

export type ListStatus = 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'PAUSED' | 'DROPPED';

export interface ListEntry {
	itemId: string;
	status: ListStatus;
	progress: number;
	updatedAt: number;
}

/** A list entry together with the item as it looked when last saved. */
export interface ListItem {
	entry: ListEntry;
	item: Item;
}

export interface User {
	id: number;
	username: string;
	showAdult: boolean;
}
