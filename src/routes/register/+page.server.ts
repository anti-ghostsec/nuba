import { error, fail, redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { safeRedirect } from '$lib/server/redirect';
import { allowSignup, createUser, passwordError, startSession, usernameError } from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

const closed = () => env.NUBA_REGISTRATION === 'closed';

export const load: PageServerLoad = ({ locals, url }) => {
	const next = safeRedirect(url.searchParams.get('next'));
	if (locals.user) redirect(303, next);
	if (closed()) error(403, 'New accounts are closed right now.');
	return { next };
};

export const actions: Actions = {
	default: async ({ request, cookies, url }) => {
		if (closed()) error(403, 'New accounts are closed right now.');
		const form = await request.formData();
		// A field people never see; bots that fill in everything give themselves away.
		if (form.get('website')) return fail(400, { username: '', message: 'Could not create the account.' });
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');
		const next = safeRedirect(form.get('next'));

		const problem =
			usernameError(username) ?? passwordError(password) ?? (password !== confirm ? 'Passwords do not match.' : null);
		if (problem) return fail(400, { username, message: problem });

		if (!allowSignup(Number(env.NUBA_SIGNUPS_PER_HOUR) || 30)) {
			return fail(429, { username, message: 'Lots of new accounts right now. Please try again in a while.' });
		}
		const user = await createUser(username, password);
		if (user === 'taken') return fail(400, { username, message: 'That username is taken.' });

		startSession(cookies, url, user.id);
		redirect(303, next);
	}
};
