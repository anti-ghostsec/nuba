import { error, redirect } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';
import { catalog } from '$lib/server/catalog';
import type { RequestHandler } from './$types';

// Image proxy for the catalog's image hosts. Visitors (especially over Tor)
// only ever talk to this server. Images are kept on disk, so each one is
// fetched from the catalog once, and browsers cache the result for a week.
const ALLOWED_HOSTS = new Set(catalog.imageHosts);
const CACHE_DIR = join(resolve(env.NUBA_DATA_DIR || 'data'), 'images');
const MAX_BYTES = 8 * 1024 * 1024;

const headers = (type: string) => ({
	'content-type': type,
	'cache-control': 'public, max-age=604800, immutable',
	'x-content-type-options': 'nosniff'
});

export const GET: RequestHandler = async ({ url }) => {
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

	const key = createHash('sha256').update(target.href).digest('hex');
	const file = join(CACHE_DIR, key.slice(0, 2), key);
	const cached = await readFile(file).catch(() => null);
	if (cached) {
		// First line holds the content type, the rest is the image.
		const split = cached.indexOf(10);
		return new Response(cached.subarray(split + 1), { headers: headers(cached.subarray(0, split).toString()) });
	}

	const upstream = await fetch(target, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
	const type = upstream?.headers.get('content-type') ?? '';
	if (!upstream?.ok || !/^image\/[\w.+-]+$/.test(type)) error(502, 'Image unavailable');

	const body = Buffer.from(await upstream.arrayBuffer());
	if (body.length <= MAX_BYTES) {
		// Write to a temp name first so a half-written file is never served.
		const tmp = `${file}.${process.pid}.tmp`;
		mkdir(join(CACHE_DIR, key.slice(0, 2)), { recursive: true })
			.then(() => writeFile(tmp, Buffer.concat([Buffer.from(`${type}\n`), body])))
			.then(() => rename(tmp, file))
			.catch((e) => console.error('Image cache write failed:', e.message));
	}
	return new Response(body, { headers: headers(type) });
};
