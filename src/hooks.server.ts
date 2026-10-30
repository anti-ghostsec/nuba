import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { catalog } from '$lib/server/catalog';
import { PREFS_COOKIE, htmlAttrs, parsePrefs } from '$lib/prefs';
import { env } from '$env/dynamic/private';
import { SESSION_COOKIE, purgeExpiredSessions, userFromSession } from '$lib/server/users';

if (!building) {
	catalog.start?.();
	// Expired sessions are removed when used; this clears the ones never used again.
	setInterval(purgeExpiredSessions, 6 * 3600_000).unref();
}

const ONION = env.NUBA_ONION_URL?.replace(/\/$/, '') || null;

export const handle: Handle = async ({ event, resolve }) => {
	const prefs = parsePrefs(event.cookies.get(PREFS_COOKIE));
	event.locals.prefs = prefs;
	// Images never need the account, so skip the session lookup for them.
	event.locals.user = event.url.pathname === '/img' ? null : userFromSession(event.cookies.get(SESSION_COOKIE));

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('data-nuba', htmlAttrs(prefs))
	});

	// Privacy and hardening headers on everything.
	const h = response.headers;
	h.set('referrer-policy', 'no-referrer');
	h.set('x-content-type-options', 'nosniff');
	h.set('x-frame-options', 'DENY');
	h.set('cross-origin-opener-policy', 'same-origin');
	h.set('cross-origin-resource-policy', 'same-origin');
	h.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()');
	if (!h.has('cache-control') && event.locals.user) h.set('cache-control', 'private, no-store');
	if (ONION && event.url.protocol === 'https:') h.set('onion-location', ONION + event.url.pathname + event.url.search);
	return response;
};
