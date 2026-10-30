import { error } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import { communityFilter, linkSearch, type LinkMatch } from '$lib/server/community';
import type { Filter, ResultPage, SearchQuery } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const params = url.searchParams;
	const adult = locals.user?.showAdult ?? false;
	const available = [...catalog.filters(adult), communityFilter(adult)].filter((f): f is Filter => !!f);
	const filters: Record<string, string[]> = {};
	for (const f of available) {
		const values = params.getAll(f.key).filter((v) => f.options.some((o) => o.value === v));
		if (values.length) filters[f.key] = f.multi ? values : values.slice(0, 1);
	}

	const query: SearchQuery = {
		text: (params.get('q') ?? '').trim().slice(0, 100),
		page: Math.min(Math.max(Number(params.get('page')) || 1, 1), 50),
		filters,
		// The visitor's default sort applies to plain browsing, not to text searches.
		sort: [params.get('sort') ?? (params.get('q') ? '' : locals.prefs.sort)].find((s) =>
			catalog.sorts.some((o) => o.value === s)
		) ?? '',
		adult
	};

	// "eat link", "rabbit eat relation": titles where those tags are linked.
	// Leftover words still search titles; ?plain=1 searches the words as typed.
	const linked = query.text && !params.has('plain') ? linkSearch(query.text, adult) : null;
	let links: Record<string, LinkMatch[]> | null = null;

	let result!: ResultPage;
	try {
		if (linked?.matches.size) {
			result = await catalog.search({ ...query, text: linked.query.rest, within: [...linked.matches.keys()] });
			if (result.items.length || query.page > 1) links = Object.fromEntries(linked.matches);
		}
		if (!links) result = await catalog.search(query);
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog search failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}

	return {
		query,
		result,
		filters: available,
		sorts: catalog.sorts,
		links,
		linkQuery: links && linked ? { kinds: linked.query.kinds, tags: linked.query.tags } : null
	};
};
