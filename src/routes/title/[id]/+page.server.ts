import { isFavorite } from '$lib/server/profiles';
import { error, fail } from '@sveltejs/kit';
import { CatalogUnavailable, catalog } from '$lib/server/catalog';
import { TagGraphError, actorFor, itemKey, itemLinks, itemTags, tags } from '$lib/server/community';
import type { ItemDetail, User } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

/** The item as this visitor may see it, or the right error page. */
async function loadItem(id: string, user: User | null): Promise<ItemDetail> {
	let item: ItemDetail | null;
	try {
		item = await catalog.item(id);
	} catch (e) {
		if (!(e instanceof CatalogUnavailable)) throw e;
		console.error('Catalog item failed:', e.message);
		error(503, `${catalog.name} is not responding right now. Try again in a moment.`);
	}
	if (!item) error(404, 'Not found');

	const adult = user?.showAdult ?? false;
	if (item.adult && !adult) {
		error(404, user ? 'This title is 18+. You can turn on adult titles in Settings.' : 'Not found');
	}
	return {
		...item,
		related: item.related.filter((r) => adult || !r.adult),
		// Adult descriptors only for people who have adult titles turned on.
		keywords: item.keywords.filter((k) => adult || !k.adult)
	};
}

/** The catalog's own tags on the item, which links may join too. */
const catalogTags = (item: ItemDetail) => [
	...item.tags.map((name) => ({ name })),
	...item.keywords.map((k) => ({ name: k.name, adult: k.adult }))
];

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = locals.user;
	const item = await loadItem(params.id, user);
	const adult = user?.showAdult ?? false;
	const graph = tags();
	const blocked = !!user && graph.isBlocked(String(user.id));
	const own = itemTags(item.id, user);

	return {
		item,
		sourceName: catalog.name,
		favorite: user ? isFavorite(user.id, item.id) : false,
		path: url.pathname,
		community: {
			tags: own,
			links: itemLinks(item.id, user),
			linkNames: graph.linkNames(adult),
			canTag: !!user && !blocked,
			blocked,
			// Tags people have used, to pick from while typing a new one.
			suggestions: user && !blocked ? graph.popular(300, adult) : [],
			// What a link here may join: community tags first, then the catalog's.
			linkable: [...new Set([...own.filter((t) => t.score > 0).map((t) => t.name), ...catalogTags(item).map((t) => graph.normalize(t.name))])]
		}
	};
};

/** Runs a change for a signed-in, unblocked visitor, turning refusals into form errors. */
async function change(
	request: Request,
	locals: App.Locals,
	id: string,
	run: (form: FormData, item: ItemDetail, user: User) => void
) {
	const user = locals.user;
	if (!user) return fail(401, { community: 'Sign in to tag titles.', name: '', members: '' });
	const form = await request.formData();
	const item = await loadItem(id, user);
	try {
		run(form, item, user);
		return { community: null };
	} catch (e) {
		if (!(e instanceof TagGraphError)) throw e;
		return fail(400, { community: e.message, name: String(form.get('name') ?? ''), members: String(form.get('members') ?? '') });
	}
}

const vote = (form: FormData) => {
	const v = Number(form.get('vote'));
	return v === 1 || v === -1 ? v : 0;
};

const requireAdmin = (user: User) => {
	if (!user.isAdmin) throw new TagGraphError('Only admins can do that.');
};

export const actions: Actions = {
	tag: ({ request, locals, params }) =>
		change(request, locals, params.id, (form, item, user) => {
			const name = String(form.get('name') ?? '');
			tags().voteTag(itemKey(item.id), name, actorFor(user), vote(form), form.get('adult') === '1');
		}),

	link: ({ request, locals, params }) =>
		change(request, locals, params.id, (form, item, user) => {
			const members = String(form.get('members') ?? '').split(',');
			tags().addLink(itemKey(item.id), String(form.get('kind') ?? ''), members, actorFor(user), catalogTags(item));
		}),

	linkVote: ({ request, locals, params }) =>
		change(request, locals, params.id, (form, item, user) => {
			const id = Number(form.get('linkId'));
			// Only links on this title, whatever the form says.
			if (!itemLinks(item.id, user).some((l) => l.id === id)) throw new TagGraphError('That link is gone.');
			tags().voteLink(id, actorFor(user), vote(form));
		}),

	removeTag: ({ request, locals, params }) =>
		change(request, locals, params.id, (form, item, user) => {
			requireAdmin(user);
			tags().removeItemTag(itemKey(item.id), String(form.get('name') ?? ''), actorFor(user));
		}),

	removeLink: ({ request, locals, params }) =>
		change(request, locals, params.id, (form, item, user) => {
			requireAdmin(user);
			const id = Number(form.get('linkId'));
			if (!itemLinks(item.id, user).some((l) => l.id === id)) throw new TagGraphError('That link is gone.');
			tags().removeLink(id, actorFor(user));
		})
};
