import { error } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import type { ResultPage, SearchQuery } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const params = url.searchParams;
	const filters: Record<string, string[]> = {};
	for (const f of catalog.filters) {
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
		adult: locals.user?.showAdult ?? false
	};

	let result: ResultPage;
	try {
		result = await catalog.search(query);
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog search failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}

	return { query, result, filters: catalog.filters, sorts: catalog.sorts };
};
