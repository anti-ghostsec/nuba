import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { catalog } from '$lib/server/catalog';
import { PREFS_COOKIE, htmlAttrs, parsePrefs } from '$lib/prefs';
import { SESSION_COOKIE, userFromSession } from '$lib/server/users';

if (!building) catalog.start?.();

export const handle: Handle = async ({ event, resolve }) => {
	const prefs = parsePrefs(event.cookies.get(PREFS_COOKIE));
	event.locals.prefs = prefs;
	// Images never need the account, so skip the session lookup for them.
	event.locals.user = event.url.pathname === '/img' ? null : userFromSession(event.cookies.get(SESSION_COOKIE));

	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('data-nuba', htmlAttrs(prefs))
	});
};
