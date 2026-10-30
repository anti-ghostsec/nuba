import { error } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import type { ResultPage } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const page = Math.min(Math.max(Number(url.searchParams.get('page')) || 1, 1), 50);

	let result: ResultPage;
	try {
		result = q ? await catalog.search(q, page) : await catalog.browse(page);
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog search failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}

	return { q, page, hasNext: result.hasNext, results: result.items };
};
