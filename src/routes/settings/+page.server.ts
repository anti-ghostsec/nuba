import { fail, redirect } from '@sveltejs/kit';
import { PREFS_COOKIE, sanitizePrefs } from '$lib/prefs';
import { catalog } from '$lib/server/catalog';
import { clearList } from '$lib/server/library';
import {
	BIO_MAX,
	FAVORITES_MAX,
	favoritesFor,
	profileById,
	setAvatar,
	setBio,
	setProfileAccent,
	setPublic
} from '$lib/server/profiles';
import type { AvatarChoice, Item } from '$lib/types';
import {
	SESSION_COOKIE,
	checkPassword,
	deleteUser,
	endOtherSessions,
	endSession,
	passwordError,
	renameUser,
	setPassword,
	setShowAdult,
	usernameError
} from '$lib/server/users';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) return { sorts: catalog.sorts, profile: null };

	// Avatar and favorite pickers search through plain GET parameters, so
	// they work without JavaScript too.
	const avatarSearch = (url.searchParams.get('avatars') ?? '').trim().slice(0, 60);
	const favSearch = (url.searchParams.get('fav') ?? '').trim().slice(0, 100);
	const safely = <T>(p: Promise<T> | undefined, fallback: T) =>
		(p ?? Promise.resolve(fallback)).catch((e) => {
			console.error('Settings picker failed:', e instanceof Error ? e.message : e);
			return fallback;
		});

	const [avatars, favResults] = await Promise.all([
		safely<AvatarChoice[]>(catalog.avatars?.(avatarSearch), []),
		favSearch
			? safely(
					catalog.search({ text: favSearch, page: 1, filters: {}, sort: '', adult: locals.user.showAdult }).then((r) => r.items.slice(0, 8)),
					[] as Item[]
				)
			: Promise.resolve([] as Item[])
	]);

	return {
		sorts: catalog.sorts,
		profile: profileById(locals.user.id),
		favorites: favoritesFor(locals.user.id),
		favoritesMax: FAVORITES_MAX,
		bioMax: BIO_MAX,
		avatars,
		avatarSearch,
		favSearch,
		favResults,
		hasAvatars: !!catalog.avatars
	};
};

/** An avatar must be an https image on one of the catalog's own image hosts. */
function validAvatar(value: string): boolean {
	try {
		const u = new URL(value);
		return u.protocol === 'https:' && catalog.imageHosts.includes(u.hostname);
	} catch {
		return false;
	}
}

/** A message shown next to the setting it belongs to. */
const say = (section: string, message: string, ok = false) => ({ section, message, ok });

// Only used when JavaScript is off; otherwise the browser writes the cookie itself.
export const actions: Actions = {
	prefs: async ({ request, cookies, locals, url }) => {
		const form = await request.formData();
		const accent = form.get('accent') === 'custom' ? form.get('accentCustom') : form.get('accent');

		// Switches send "false" from a hidden field and "true" from the box when
		// ticked, so the last value wins. Fields this form didn't have are kept.
		const bool = (key: string) => {
			const v = form.getAll(key).at(-1);
			return v === 'true' ? true : v === 'false' ? false : undefined;
		};
		const prefs = sanitizePrefs(
			{
				mode: form.get('mode'),
				accent,
				titleLang: form.get('titleLang'),
				reduceMotion: bool('reduceMotion'),
				textSize: form.get('textSize'),
				sort: form.get('sort') ?? undefined,
				showContinue: bool('showContinue')
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
	},

	content: async ({ request, locals }) => {
		if (!locals.user) return fail(401, { message: 'Sign in to change this.' });
		const form = await request.formData();
		setShowAdult(locals.user.id, form.get('showAdult') === '1');
		redirect(303, '/settings#content');
	},

	avatar: async ({ request, locals }) => {
		if (!locals.user) return fail(401, say('avatar', 'Sign in first.'));
		const value = String((await request.formData()).get('avatar') ?? '');
		if (value && !validAvatar(value)) return fail(400, say('avatar', 'Pick one of the pictures shown.'));
		setAvatar(locals.user.id, value || null);
		return say('avatar', 'Avatar saved.', true);
	},

	bio: async ({ request, locals }) => {
		if (!locals.user) return fail(401, say('bio', 'Sign in first.'));
		setBio(locals.user.id, String((await request.formData()).get('bio') ?? ''));
		return say('bio', 'Status saved.', true);
	},

	profileAccent: async ({ request, locals }) => {
		if (!locals.user) return fail(401, say('profileAccent', 'Sign in first.'));
		const form = await request.formData();
		const value = form.get('profileAccent') === 'custom' ? form.get('profileAccentCustom') : form.get('profileAccent');
		setProfileAccent(locals.user.id, typeof value === 'string' && value ? value : null);
		return say('profileAccent', 'Profile accent saved.', true);
	},

	public: async ({ request, locals }) => {
		if (!locals.user) return fail(401, say('public', 'Sign in first.'));
		setPublic(locals.user.id, (await request.formData()).get('public') === '1');
		return say('public', 'Saved.', true);
	},

	username: async ({ request, locals }) => {
		if (!locals.user) return fail(401, say('username', 'Sign in first.'));
		const username = String((await request.formData()).get('username') ?? '').trim();
		if (username === locals.user.username) return say('username', 'That is already your username.', true);
		const problem = usernameError(username);
		if (problem) return fail(400, say('username', problem));
		if (renameUser(locals.user.id, username) === 'taken') return fail(400, say('username', 'That username is taken.'));
		return say('username', 'Username changed.', true);
	},

	password: async ({ request, locals, cookies }) => {
		if (!locals.user) return fail(401, say('password', 'Sign in first.'));
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		if (!(await checkPassword(locals.user.id, current))) return fail(400, say('password', 'Current password is wrong.'));
		const problem = passwordError(next);
		if (problem) return fail(400, say('password', problem));
		if (next !== form.get('repeat')) return fail(400, say('password', "The new passwords don't match."));
		await setPassword(locals.user.id, next, cookies.get(SESSION_COOKIE));
		return say('password', 'Password changed. Other devices are signed out.', true);
	},

	signOutOthers: async ({ locals, cookies }) => {
		if (!locals.user) return fail(401, say('sessions', 'Sign in first.'));
		endOtherSessions(locals.user.id, cookies.get(SESSION_COOKIE));
		return say('sessions', 'Signed out of every other device.', true);
	},

	clearList: async ({ request, locals }) => {
		if (!locals.user) return fail(401, say('clear', 'Sign in first.'));
		if ((await request.formData()).get('confirm') !== 'yes') {
			return fail(400, say('clear', 'Tick the box to confirm.'));
		}
		clearList(locals.user.id);
		return say('clear', 'Your list is empty now.', true);
	},

	deleteAccount: async ({ request, locals, cookies }) => {
		if (!locals.user) return fail(401, say('delete', 'Sign in first.'));
		const password = String((await request.formData()).get('password') ?? '');
		if (!(await checkPassword(locals.user.id, password))) return fail(400, say('delete', 'Wrong password.'));
		endSession(cookies);
		deleteUser(locals.user.id);
		redirect(303, '/');
	}
};
