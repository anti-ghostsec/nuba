import { fail, redirect } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import { removeEntry, saveEntry } from '$lib/server/library';
import { FAVORITES_MAX, addFavorite, isFavorite, removeFavorite } from '$lib/server/profiles';
import { safeRedirect } from '$lib/server/redirect';
import { STATUSES } from '$lib/site';
import type { ListStatus } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	if (!locals.user) redirect(303, `/login?next=${encodeURIComponent(url.pathname)}`);
};

/** Enhanced (JS) submissions get data back; plain form posts get redirected. */
function done(request: Request, form: FormData, data: Record<string, unknown>) {
	if (request.headers.get('x-sveltekit-action') === 'true') return data;
	redirect(303, safeRedirect(form.get('redirectTo')));
}

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to keep a list.' });
		const form = await request.formData();

		const itemId = String(form.get('itemId') ?? '');
		const status = String(form.get('status') ?? 'CURRENT') as ListStatus;
		const progress = Number(form.get('progress') ?? 0);
		if (!STATUSES.includes(status)) return fail(400, { message: 'Unknown status.' });
		if (!Number.isInteger(progress) || progress < 0 || progress > 100_000) return fail(400, { message: 'Bad progress.' });

		// Snapshot the item from the catalog, never from the form.
		let item;
		try {
			item = await catalog.item(itemId);
		} catch (e) {
			if (e instanceof CatalogUnavailable) return fail(503, { message: 'Could not reach the catalog. Try again.' });
			throw e;
		}
		if (!item || (item.adult && !locals.user.showAdult)) return fail(404, { message: 'That item no longer exists.' });

		const capped = item.total ? Math.min(progress, item.total) : progress;
		const entry = saveEntry(locals.user.id, item, status, capped);
		return done(request, form, { entry });
	},

	/** Adds or removes a favorite (form field `on` = "1" or "0"). */
	favorite: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to keep favorites.' });
		const form = await request.formData();
		const itemId = String(form.get('itemId') ?? '');
		if (form.get('on') !== '1') {
			removeFavorite(locals.user.id, itemId);
			return done(request, form, { favorite: false });
		}
		if (isFavorite(locals.user.id, itemId)) return done(request, form, { favorite: true });

		let item;
		try {
			item = await catalog.item(itemId);
		} catch (e) {
			if (e instanceof CatalogUnavailable) return fail(503, { message: 'Could not reach the catalog. Try again.' });
			throw e;
		}
		if (!item || (item.adult && !locals.user.showAdult)) return fail(404, { message: 'That item no longer exists.' });
		if (!addFavorite(locals.user.id, item)) {
			return fail(400, { message: `You can have up to ${FAVORITES_MAX} favorites. Remove one in Settings first.` });
		}
		return done(request, form, { favorite: true });
	},

	remove: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to keep a list.' });
		const form = await request.formData();

		const itemId = String(form.get('itemId') ?? '');
		if (!itemId) return fail(400, { message: 'Missing item.' });

		removeEntry(locals.user.id, itemId);
		return done(request, form, { removed: itemId });
	}
};
