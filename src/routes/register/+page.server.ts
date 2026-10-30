import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect } from '$lib/server/redirect';
import { createUser, passwordError, startSession, usernameError } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeRedirect(url.searchParams.get('next'));
	if (locals.user) redirect(303, next);
	return { next };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const next = safeRedirect(form.get('next'));

		const problem =
			usernameError(username) ?? passwordError(password) ?? (password !== confirm ? 'Passwords do not match.' : null);
		if (problem) return fail(400, { username, message: problem });

		const user = await createUser(username, password);
		if (user === 'taken') return fail(400, { username, message: 'That username is taken.' });

		startSession(cookies, url, user.id);
		redirect(303, next);
	}
};
