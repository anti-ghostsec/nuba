import { error, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { catalog } from '$lib/server/catalog';
import type { RequestHandler } from './$types';

// Image proxy for the catalog's image hosts. Visitors (especially over Tor)
// only ever talk to this server, and browsers can cache the result for a week.
const ALLOWED_HOSTS = new Set(catalog.imageHosts);

export const GET: RequestHandler = async ({ url, setHeaders }) => {
	let target: URL;
	try {
		target = new URL(url.searchParams.get('u') ?? '');
	} catch {
		error(400, 'Bad image URL');
	}
	if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) {
		error(400, 'Image host not allowed');
	}

	if (env.NUBA_IMAGE_PROXY === 'false') redirect(302, target.href);

	const upstream = await fetch(target, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
	const type = upstream?.headers.get('content-type') ?? '';
	if (!upstream?.ok || !type.startsWith('image/')) error(502, 'Image unavailable');

	setHeaders({
		'content-type': type,
		'cache-control': 'public, max-age=604800, immutable',
		'x-content-type-options': 'nosniff'
	});
	return new Response(upstream.body);
};
