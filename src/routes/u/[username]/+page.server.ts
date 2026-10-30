import { error } from '@sveltejs/kit';
import { listFor } from '$lib/server/library';
import { favoritesFor, profileByName } from '$lib/server/profiles';
import { STATUSES } from '$lib/site';
import type { ListStatus } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, locals }) => {
	const found = profileByName(params.username);
	if (!found) error(404, 'No such user.');
	const { userId, ...profile } = found;

	const own = locals.user?.id === userId;
	const visible = own || profile.isPublic;
	// Adult titles only show to visitors who have them turned on themselves.
	const adult = locals.user?.showAdult ?? false;
	const shown = <T extends { adult?: boolean }>(item: T) => adult || !item.adult;

	const list = visible ? listFor(userId).filter((l) => shown(l.item)) : [];
	const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<ListStatus, number>;
	for (const l of list) counts[l.entry.status]++;

	return {
		profile,
		own,
		visible,
		counts,
		units: list.reduce((sum, l) => sum + l.entry.progress, 0),
		list,
		favorites: visible ? favoritesFor(userId).filter(shown) : []
	};
};
