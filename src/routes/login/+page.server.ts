import { fail, redirect } from '@sveltejs/kit';
import { safeRedirect } from '$lib/server/redirect';
import { authenticate, clearFailures, isThrottled, recordFailure, startSession } from '$lib/server/users';
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
		const next = safeRedirect(form.get('next'));

		if (!username || !password) return fail(400, { username, message: 'Enter your username and password.' });
		if (isThrottled(username)) {
			return fail(429, { username, message: 'Too many attempts. Wait a few minutes and try again.' });
		}

		const user = await authenticate(username, password);
		if (!user) {
			recordFailure(username);
			return fail(400, { username, message: 'Wrong username or password.' });
		}

		clearFailures(username);
		startSession(cookies, url, user.id);
		redirect(303, next);
	}
};
