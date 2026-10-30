import type { Filter, HomeFeed, ItemDetail, Option, ResultPage, SearchQuery } from '$lib/types';

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
	/** Filters and sort orders offered on the search page. */
	filters: Filter[];
	sorts: Option[];

	/** Optional background work (e.g. keeping a local search index), started once with the server. */
	start?(): void;

	home(): Promise<HomeFeed>;
	/** Search, or browse when the text is empty. Excludes adult items unless query.adult. */
	search(query: SearchQuery): Promise<ResultPage>;
	/** Returns null when the item does not exist. Adult items are returned with adult: true. */
	item(id: string): Promise<ItemDetail | null>;
}

/** Thrown when the source is down or rate-limited; routes turn it into a 503. */
export class CatalogUnavailable extends Error {}
