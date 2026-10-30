import { redirect } from '@sveltejs/kit';
import { PREFS_COOKIE, sanitizePrefs } from '$lib/prefs';
import type { Actions } from './$types';

// Only used when JavaScript is off; otherwise the browser writes the cookie itself.
export const actions: Actions = {
	default: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const accent = form.get('accent') === 'custom' ? form.get('accentCustom') : form.get('accent');

		const prefs = sanitizePrefs(
			{
				mode: form.get('mode'),
				accent,
				titleLang: form.get('titleLang'),
				reduceMotion: form.get('reduceMotion') === 'on'
			},
			locals.prefs
		);

		cookies.set(PREFS_COOKIE, JSON.stringify(prefs), {
			path: '/',
			maxAge: 60 * 60 * 24 * 365,
			sameSite: 'lax',
			httpOnly: false,
			// .onion sites are usually plain HTTP (Tor already encrypts end to end),
			// so only mark the cookie secure when we really are on HTTPS.
			secure: url.protocol === 'https:'
		});

		const target = String(form.get('redirectTo') ?? '/settings');
		redirect(303, target.startsWith('/') && !target.startsWith('//') ? target : '/settings');
	}
};
