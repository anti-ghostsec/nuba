import type { HomeFeed, ItemDetail, ResultPage } from '$lib/types';

/**
 * A data source for Nuba. Implement this to point Nuba at something else:
 * another anime API, a book database, a product catalog…
 */
export interface Catalog {
	/** Shown in the footer credit, e.g. "AniList". */
	name: string;
	url: string;
	/** Hosts the image proxy may fetch from. */
	imageHosts: string[];

	home(): Promise<HomeFeed>;
	search(query: string, page: number): Promise<ResultPage>;
	/** Default browsing order when there is no search query. */
	browse(page: number): Promise<ResultPage>;
	/** Returns null when the item does not exist or should not be shown. */
	item(id: string): Promise<ItemDetail | null>;
}

/** Thrown when the source is down or rate-limited; routes turn it into a 503. */
export class CatalogUnavailable extends Error {}
