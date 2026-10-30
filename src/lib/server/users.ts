import { createHash, randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import type { User } from '$lib/types';
import { getDb } from './db';

// Accounts are just a username and a password: no email, nothing to link
// to a real identity. Sessions are random tokens; only their hash is stored.

export const SESSION_COOKIE = 'nuba_session';
const SESSION_DAYS = 30;
const DAY = 86_400_000;

const scryptAsync = (password: BinaryLike, salt: BinaryLike, keylen: number, options: ScryptOptions) =>
	new Promise<Buffer>((done, fail) => scrypt(password, salt, keylen, options, (err, key) => (err ? fail(err) : done(key))));
const SCRYPT = { N: 16384, r: 8, p: 1 };

export const USERNAME_RULES = '3–24 characters: letters, numbers, _ or -';
export const PASSWORD_MIN = 8;

export function usernameError(username: string): string | null {
	return /^[A-Za-z0-9_-]{3,24}$/.test(username) ? null : `Username must be ${USERNAME_RULES}.`;
}

export function passwordError(password: string): string | null {
	if (password.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
	if (password.length > 200) return 'Password is too long.';
	return null;
}

async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(16);
	const key = await scryptAsync(password.normalize('NFKC'), salt, 64, SCRYPT);
	return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [, salt, hash] = stored.split('$');
	const key = await scryptAsync(password.normalize('NFKC'), Buffer.from(salt, 'hex'), 64, SCRYPT);
	return timingSafeEqual(key, Buffer.from(hash, 'hex'));
}

// Checked against when the username doesn't exist, so timing doesn't reveal which usernames are taken.
const DUMMY_HASH = hashPassword(randomBytes(16).toString('hex'));

export async function createUser(username: string, password: string): Promise<User | 'taken'> {
	const hash = await hashPassword(password);
	try {
		const { lastInsertRowid } = getDb()
			.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
			.run(username, hash, Date.now());
		return { id: Number(lastInsertRowid), username, showAdult: false };
	} catch (e) {
		if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') return 'taken';
		throw e;
	}
}

export async function authenticate(username: string, password: string): Promise<User | null> {
	const row = getDb()
		.prepare('SELECT id, username, password_hash, show_adult FROM users WHERE username = ?')
		.get(username) as { id: number; username: string; password_hash: string; show_adult: number } | undefined;

	const ok = await verifyPassword(password, row?.password_hash ?? (await DUMMY_HASH));
	return row && ok ? { id: row.id, username: row.username, showAdult: !!row.show_adult } : null;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function startSession(cookies: Cookies, url: URL, userId: number) {
	const token = randomBytes(32).toString('base64url');
	getDb()
		.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.run(hashToken(token), userId, Date.now() + SESSION_DAYS * DAY);

	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		maxAge: SESSION_DAYS * 86_400,
		httpOnly: true,
		sameSite: 'lax',
		// .onion sites are usually plain HTTP (Tor already encrypts end to end).
		secure: url.protocol === 'https:'
	});
}

export function endSession(cookies: Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) getDb().prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

/** Look up the session's user, sliding the expiry forward for active users. */
export function userFromSession(token: string | undefined): User | null {
	if (!token) return null;
	const db = getDb();
	const id = hashToken(token);
	const row = db
		.prepare(
			'SELECT s.expires_at, u.id, u.username, u.show_adult FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?'
		)
		.get(id) as { expires_at: number; id: number; username: string; show_adult: number } | undefined;

	if (!row) return null;
	if (row.expires_at < Date.now()) {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
		return null;
	}
	if (row.expires_at - Date.now() < (SESSION_DAYS / 2) * DAY) {
		db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(Date.now() + SESSION_DAYS * DAY, id);
	}
	return { id: row.id, username: row.username, showAdult: !!row.show_adult };
}

/** The user's own declaration that they are 18 or older. */
export function setShowAdult(userId: number, on: boolean) {
	getDb().prepare('UPDATE users SET show_adult = ? WHERE id = ?').run(on ? 1 : 0, userId);
}

// Simple in-memory brake on password guessing, per username. (Over Tor every
// visitor shares one IP, so per-IP limits would lock everyone out.)
const failures = new Map<string, { count: number; since: number }>();
const WINDOW = 15 * 60_000;
const MAX_FAILURES = 8;

export function isThrottled(username: string): boolean {
	const f = failures.get(username.toLowerCase());
	if (!f || Date.now() - f.since > WINDOW) return false;
	return f.count >= MAX_FAILURES;
}

export function recordFailure(username: string) {
	const key = username.toLowerCase();
	const f = failures.get(key);
	if (!f || Date.now() - f.since > WINDOW) failures.set(key, { count: 1, since: Date.now() });
	else f.count++;
	if (failures.size > 10_000) failures.clear();
}

export function clearFailures(username: string) {
	failures.delete(username.toLowerCase());
}
