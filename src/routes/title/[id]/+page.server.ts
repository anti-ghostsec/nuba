import { error } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import type { ItemDetail } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	let item: ItemDetail | null;
	try {
		item = await catalog.item(params.id);
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog item failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}
	if (!item) error(404, 'Not found');

	return { item, sourceName: catalog.name };
};
