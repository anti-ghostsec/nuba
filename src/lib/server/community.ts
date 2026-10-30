import type { Filter, User } from '$lib/types';
import { catalogKey } from './catalog';
import { getDb } from './db';
import { TagGraph, type Actor, type LinkMatch, type LinkQuery, type Viewer } from './taggraph';
import { indexFor, setOverlaySource, type Overlay } from './title-index';

// Community tags and links in Nuba: the tag graph kept in Nuba's database,
// items filed as "catalog:id", people as their user id. Visible tags are laid
// over the title index, so search and the Community filter see them.

export { TagGraphError } from './taggraph';
export type { ItemLink, ItemTag, LinkMatch } from './taggraph';

/** The search filter (and index facet) community tags go in. */
export const COMMUNITY = 'community';

const keyOf = (id: string) => `${catalogKey}:${id}`;
const idOf = (key: string) => (key.startsWith(`${catalogKey}:`) ? key.slice(catalogKey.length + 1) : null);

function overlay(list: { name: string; adult: boolean }[]): Overlay {
	const plain = list.filter((t) => !t.adult).map((t) => t.name);
	const adult = list.filter((t) => t.adult).map((t) => t.name);
	return { facets: { [COMMUNITY]: plain }, adultFacets: { [COMMUNITY]: adult }, keywords: plain, adultKeywords: adult };
}

let graph: TagGraph | undefined;

/** Opened on first use, so builds never touch the database. */
export function tags(): TagGraph {
	if (graph) return graph;
	const g = (graph = new TagGraph(getDb(), { prefix: 'tg' }));
	g.onChange((items) => {
		const index = indexFor(catalogKey);
		if (!index) return;
		if (!items) return index.reloadOverlays();
		for (const key of items) {
			const id = idOf(key);
			const list = g.visibleTags(key).get(key);
			if (id) index.setOverlay(id, list ? overlay(list) : null);
		}
	});
	return g;
}

setOverlaySource((catalog) => {
	const out = new Map<string, Overlay>();
	if (catalog !== catalogKey) return out;
	for (const [key, list] of tags().visibleTags()) {
		const id = idOf(key);
		if (id) out.set(id, overlay(list));
	}
	return out;
});

const DAY = 86_400_000;

/** Accounts can make new tag names from their second day; admins moderate. */
export function actorFor(user: User): Actor {
	const row = getDb().prepare('SELECT created_at FROM users WHERE id = ?').get(user.id) as { created_at: number } | undefined;
	return {
		id: String(user.id),
		adult: user.showAdult,
		canCreate: user.isAdmin || (!!row && Date.now() - row.created_at >= DAY),
		moderator: user.isAdmin
	};
}

export const viewerFor = (user: User | null): Viewer => ({ id: user ? String(user.id) : undefined, adult: user?.showAdult ?? false });

export const itemTags = (id: string, user: User | null) => tags().itemTags(keyOf(id), viewerFor(user));
export const itemLinks = (id: string, user: User | null) => tags().itemLinks(keyOf(id), viewerFor(user));
export const itemKey = keyOf;

/** The Community filter, offering every tag in use (hidden while there are none). */
export function communityFilter(adult: boolean): Filter | null {
	const values = indexFor(catalogKey)?.facetValues(COMMUNITY, 1, adult) ?? [];
	if (!values.length) return null;
	return { key: COMMUNITY, label: 'Community', multi: true, picker: true, options: values.map((v) => ({ value: v, label: v })) };
}

/**
 * A search that names a link ("eat link", "rabbit eat relation"): the titles
 * holding such a link, by id, with the matching links. Null when the text
 * doesn't name a link.
 */
export function linkSearch(text: string, adult: boolean): { query: LinkQuery; matches: Map<string, LinkMatch[]> } | null {
	const g = tags();
	const query = g.parse(text, adult);
	if (!query) return null;
	const matches = new Map<string, LinkMatch[]>();
	for (const [key, list] of g.findLinked(query, { adult })) {
		const id = idOf(key);
		if (id) matches.set(id, list);
	}
	return { query, matches };
}

/** An account is going away: take back its votes and its name from the log. */
export const forgetUser = (userId: number) => tags().forget(String(userId));
