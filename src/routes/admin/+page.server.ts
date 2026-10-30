import { error, fail } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { catalog } from '$lib/server/catalog';
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
	const db = getDb();
	const count = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
	return {
		q,
		users: listUsers(q),
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
		deleteUser(user.id);
		return { userId: user.id, message: `Deleted ${user.username}.` };
	},

	resync: ({ locals }) => {
		requireAdmin(locals);
		catalog.resync?.();
		return { message: 'Re-downloading the title list in the background. Search keeps working meanwhile.' };
	}
};
