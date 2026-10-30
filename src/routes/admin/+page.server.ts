import { error, fail } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { catalog } from '$lib/server/catalog';
import { TagGraphError, actorFor, forgetUser, tags } from '$lib/server/community';
import { getDb } from '$lib/server/db';
import { deleteUser, listUsers, setAdmin, setPassword, userById } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

// Admins are made with `npm run admin -- <username>` on the server; this
// page only exists for them (everyone else gets a plain 404).

function requireAdmin(locals: App.Locals) {
	if (!locals.user?.isAdmin) error(404, 'Not found');
	return locals.user;
}

export const load: PageServerLoad = ({ locals, url }) => {
	requireAdmin(locals);
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 24);
	const tq = (url.searchParams.get('tag') ?? '').trim().slice(0, 40);
	const db = getDb();
	const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
	const graph = tags();

	// The activity log names accounts by id; show usernames (gone ones stay blank).
	const recent = graph.recent(60);
	const ids = [...new Set(recent.map((e) => Number(e.actor)).filter(Number.isInteger))];
	const names = new Map(
		ids.length
			? (db.prepare(`SELECT id, username FROM users WHERE id IN (${ids.map(() => '?').join(',')})`).all(...ids) as { id: number; username: string }[]).map(
					(u) => [String(u.id), u.username]
				)
			: []
	);
	const catalogPrefix = /^[^:]+:/;

	return {
		q,
		users: listUsers(q).map((u) => ({ ...u, tagBlocked: graph.isBlocked(String(u.id)) })),
		community: {
			tq,
			stats: graph.stats(),
			tags: graph.searchTags(tq, tq ? 60 : 30),
			linkNames: graph.linkNames(true),
			recent: recent.map((e) => ({
				...e,
				username: e.actor ? (names.get(e.actor) ?? null) : null,
				titleId: e.item ? e.item.replace(catalogPrefix, '') : null
			}))
		},
		stats: [
			{ label: 'Accounts', value: count('SELECT count(*) n FROM users').toLocaleString('en') },
			{ label: 'Signed in now (sessions)', value: count('SELECT count(*) n FROM sessions').toLocaleString('en') },
			{ label: 'List entries', value: count('SELECT count(*) n FROM list_entries').toLocaleString('en') },
			{ label: 'Admins', value: count('SELECT count(*) n FROM users WHERE is_admin = 1').toLocaleString('en') }
		],
		catalog: { name: catalog.name, status: catalog.status?.() ?? [], canResync: !!catalog.resync }
	};
};

/** The target user, refusing to act on yourself where that would lock you out. */
async function target(request: Request, locals: App.Locals, notSelf: string | null) {
	const me = requireAdmin(locals);
	const id = Number((await request.formData()).get('userId'));
	const user = Number.isInteger(id) ? userById(id) : null;
	if (!user) return { problem: fail(404, { userId: id, message: 'No such user.' }) };
	if (notSelf && user.id === me.id) return { problem: fail(400, { userId: id, message: notSelf }) };
	return { user };
}

export const actions: Actions = {
	resetPassword: async ({ request, locals }) => {
		const { user, problem } = await target(request, locals, null);
		if (problem) return problem;
		// Readable but strong: there's no email, so the admin passes this on.
		const password = randomBytes(12).toString('base64url');
		await setPassword(user.id, password);
		return { userId: user.id, message: `New password for ${user.username}: ${password}`, secret: true };
	},

	toggleAdmin: async ({ request, locals }) => {
		const { user, problem } = await target(request, locals, "You can't remove your own admin rights here.");
		if (problem) return problem;
		setAdmin(user.id, !user.isAdmin);
		return { userId: user.id, message: user.isAdmin ? `${user.username} is no longer an admin.` : `${user.username} is now an admin.` };
	},

	deleteUser: async ({ request, locals }) => {
		const { user, problem } = await target(request, locals, 'Delete your own account from Settings.');
		if (problem) return problem;
		forgetUser(user.id);
		deleteUser(user.id);
		return { userId: user.id, message: `Deleted ${user.username}.` };
	},

	toggleTagging: async ({ request, locals }) => {
		const { user, problem } = await target(request, locals, "You can't turn off your own tagging.");
		if (problem) return problem;
		const graph = tags();
		const blocked = graph.isBlocked(String(user.id));
		graph.setBlocked(String(user.id), !blocked, actorFor(locals.user!));
		return { userId: user.id, message: blocked ? `${user.username} can tag again.` : `${user.username} can no longer tag or link.` };
	},

	undoTags: async ({ request, locals }) => {
		const { user, problem } = await target(request, locals, null);
		if (problem) return problem;
		tags().forget(String(user.id), actorFor(locals.user!));
		return { userId: user.id, message: `Took back every tag, link and vote by ${user.username}.` };
	},

	editTag: async ({ request, locals }) => {
		const me = requireAdmin(locals);
		const form = await request.formData();
		const name = String(form.get('name') ?? '');
		const to = String(form.get('to') ?? '');
		const graph = tags();
		const mod = actorFor(me);
		try {
			switch (form.get('op')) {
				case 'ban':
					graph.setBanned(name, true, mod);
					return { message: `Banned “${name}”. It's off every title and can't be used again.` };
				case 'unban':
					graph.setBanned(name, false, mod);
					return { message: `“${name}” can be used again.` };
				case 'adult':
				case 'unadult':
					graph.setAdult(name, form.get('op') === 'adult', mod);
					return { message: `“${name}” is ${form.get('op') === 'adult' ? 'now' : 'no longer'} an adult tag.` };
				case 'rename':
					graph.rename(name, to, mod);
					return { message: `Renamed “${name}” to “${graph.normalize(to)}”.` };
				case 'merge':
					graph.merge(name, to, mod);
					return { message: `Merged “${name}” into “${graph.normalize(to)}”. The old name now means the same tag.` };
				case 'linkName':
					graph.addLinkName(name, mod);
					return { message: `Added the link name “${graph.normalize(name)}”.` };
				default:
					return fail(400, { message: 'Unknown tag action.' });
			}
		} catch (e) {
			if (!(e instanceof TagGraphError)) throw e;
			return fail(400, { message: e.message });
		}
	},

	resync: ({ locals }) => {
		requireAdmin(locals);
		catalog.resync?.();
		return { message: 'Re-downloading the title list in the background. Search keeps working meanwhile.' };
	}
};
