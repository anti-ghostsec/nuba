import { isFavorite } from '$lib/server/profiles';
import { error } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import type { ItemDetail } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	let item: ItemDetail | null;
	try {
		item = await catalog.item(params.id);
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog item failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}
	if (!item) error(404, 'Not found');

	const adult = locals.user?.showAdult ?? false;
	if (item.adult && !adult) {
		error(404, locals.user ? 'This title is 18+. You can turn on adult titles in Settings.' : 'Not found');
	}

	return {
		item: {
			...item,
			related: item.related.filter((r) => adult || !r.adult),
			// Adult descriptors only for people who have adult titles turned on.
			keywords: item.keywords.filter((k) => adult || !k.adult)
		},
		sourceName: catalog.name,
		favorite: locals.user ? isFavorite(locals.user.id, item.id) : false,
		path: url.pathname
	};
};
