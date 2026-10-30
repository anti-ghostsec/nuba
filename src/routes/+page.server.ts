import { error } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import type { HomeFeed } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let feed: HomeFeed;
	try {
		feed = await catalog.home();
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog home failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}
	return { feed, now: Math.floor(Date.now() / 1000) };
};
