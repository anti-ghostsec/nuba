import { isHex } from '$lib/prefs';
import type { Item, Profile } from '$lib/types';
import { getDb } from './db';
import { cardOf } from './library';

// Profiles and favorites. Avatars are picked from catalog art (no uploads:
// on an anonymous site those invite abuse), and profiles start private.

export const BIO_MAX = 80;
export const FAVORITES_MAX = 10;

interface Row {
	username: string;
	created_at: number;
	bio: string;
	avatar: string | null;
	profile_accent: string | null;
	public_profile: number;
}

const toProfile = (r: Row): Profile => ({
	username: r.username,
	joinedAt: r.created_at,
	bio: r.bio,
	avatar: r.avatar,
	accent: r.profile_accent,
	isPublic: !!r.public_profile
});

const COLUMNS = 'id, username, created_at, bio, avatar, profile_accent, public_profile';

export function profileByName(username: string): (Profile & { userId: number }) | null {
	const row = getDb().prepare(`SELECT ${COLUMNS} FROM users WHERE username = ?`).get(username) as
		| (Row & { id: number })
		| undefined;
	return row ? { ...toProfile(row), userId: row.id } : null;
}

export function profileById(userId: number): Profile | null {
	const row = getDb().prepare(`SELECT ${COLUMNS} FROM users WHERE id = ?`).get(userId) as Row | undefined;
	return row ? toProfile(row) : null;
}

export function setBio(userId: number, bio: string) {
	getDb().prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio.replace(/\s+/g, ' ').trim().slice(0, BIO_MAX), userId);
}

/** `image` must already be checked against the catalog's image hosts. */
export function setAvatar(userId: number, image: string | null) {
	getDb().prepare('UPDATE users SET avatar = ? WHERE id = ?').run(image, userId);
}

export function setProfileAccent(userId: number, accent: string | null) {
	getDb()
		.prepare('UPDATE users SET profile_accent = ? WHERE id = ?')
		.run(accent && isHex(accent) ? accent.toLowerCase() : null, userId);
}

export function setPublic(userId: number, on: boolean) {
	getDb().prepare('UPDATE users SET public_profile = ? WHERE id = ?').run(on ? 1 : 0, userId);
}

export function favoritesFor(userId: number): Item[] {
	const rows = getDb()
		.prepare('SELECT snapshot FROM favorites WHERE user_id = ? ORDER BY added_at DESC')
		.all(userId) as { snapshot: string }[];
	return rows.map((r) => JSON.parse(r.snapshot));
}

export function isFavorite(userId: number, itemId: string): boolean {
	return !!getDb().prepare('SELECT 1 FROM favorites WHERE user_id = ? AND item_id = ?').get(userId, itemId);
}

/** Adds a favorite; false when the limit is reached. */
export function addFavorite(userId: number, item: Item): boolean {
	const db = getDb();
	const { n } = db.prepare('SELECT count(*) n FROM favorites WHERE user_id = ?').get(userId) as { n: number };
	if (n >= FAVORITES_MAX && !isFavorite(userId, item.id)) return false;
	db.prepare(
		`INSERT INTO favorites (user_id, item_id, added_at, snapshot) VALUES (?, ?, ?, ?)
		 ON CONFLICT (user_id, item_id) DO UPDATE SET snapshot = excluded.snapshot`
	).run(userId, item.id, Date.now(), JSON.stringify(cardOf(item)));
	return true;
}

export function removeFavorite(userId: number, itemId: string) {
	getDb().prepare('DELETE FROM favorites WHERE user_id = ? AND item_id = ?').run(userId, itemId);
}
