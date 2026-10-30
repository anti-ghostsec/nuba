import { error } from '@sveltejs/kit';
import { listFor } from '$lib/server/library';
import { SITE } from '$lib/site';
import type { RequestHandler } from './$types';

// Your list as JSON, to keep or to move elsewhere.
export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) error(401, 'Sign in first.');
	const list = listFor(locals.user.id).map(({ entry, item }) => ({
		id: item.id,
		title: item.title,
		titles: item.altTitles,
		status: entry.status,
		progress: entry.progress,
		total: item.total,
		updatedAt: new Date(entry.updatedAt).toISOString()
	}));
	const body = JSON.stringify({ site: SITE.name, username: locals.user.username, exportedAt: new Date().toISOString(), list }, null, 2);
	return new Response(body, {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'content-disposition': `attachment; filename="${SITE.name.toLowerCase()}-list.json"`,
			'cache-control': 'no-store'
		}
	});
};
