import { catalog } from '$lib/server/catalog';
import { listFor } from '$lib/server/library';
import { profileById } from '$lib/server/profiles';
import type { ListEntry } from '$lib/types';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, depends }) => {
	depends('nuba:library');

	const list = locals.user ? listFor(locals.user.id) : [];
	const library: Record<string, ListEntry> = {};
	for (const { entry } of list) library[entry.itemId] = entry;

	return {
		prefs: locals.prefs,
		user: locals.user,
		source: { name: catalog.name, url: catalog.url },
		library,
		list,
		avatar: locals.user ? (profileById(locals.user.id)?.avatar ?? null) : null
	};
};
