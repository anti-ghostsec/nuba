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
		return { id: Number(lastInsertRowid), username, showAdult: false, isAdmin: false };
	} catch (e) {
		if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') return 'taken';
		throw e;
	}
}

export async function authenticate(username: string, password: string): Promise<User | null> {
	const row = getDb()
		.prepare('SELECT id, username, password_hash, show_adult, is_admin FROM users WHERE username = ?')
		.get(username) as (UserRow & { password_hash: string }) | undefined;

	const ok = await verifyPassword(password, row?.password_hash ?? (await DUMMY_HASH));
	return row && ok ? toUser(row) : null;
}

interface UserRow {
	id: number;
	username: string;
	show_adult: number;
	is_admin: number;
}

const toUser = (row: UserRow): User => ({
	id: row.id,
	username: row.username,
	showAdult: !!row.show_adult,
	isAdmin: !!row.is_admin
});

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

export function purgeExpiredSessions() {
	getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
}

/** Look up the session's user, sliding the expiry forward for active users. */
export function userFromSession(token: string | undefined): User | null {
	if (!token) return null;
	const db = getDb();
	const id = hashToken(token);
	const row = db
		.prepare(
			'SELECT s.expires_at, u.id, u.username, u.show_adult, u.is_admin FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ?'
		)
		.get(id) as (UserRow & { expires_at: number }) | undefined;

	if (!row) return null;
	if (row.expires_at < Date.now()) {
		db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
		return null;
	}
	if (row.expires_at - Date.now() < (SESSION_DAYS / 2) * DAY) {
		db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(Date.now() + SESSION_DAYS * DAY, id);
	}
	return toUser(row);
}

export function renameUser(userId: number, username: string): 'taken' | null {
	try {
		getDb().prepare('UPDATE users SET username = ? WHERE id = ?').run(username, userId);
		return null;
	} catch (e) {
		if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE') return 'taken';
		throw e;
	}
}

/** Checks the password without the timing tricks of authenticate(): the user is known. */
export async function checkPassword(userId: number, password: string): Promise<boolean> {
	const row = getDb().prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as
		| { password_hash: string }
		| undefined;
	return !!row && (await verifyPassword(password, row.password_hash));
}

/** Sets a new password and signs out every session except `keepToken` (if given). */
export async function setPassword(userId: number, password: string, keepToken?: string) {
	const hash = await hashPassword(password);
	const db = getDb();
	db.transaction(() => {
		db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
		endOtherSessions(userId, keepToken);
	})();
}

/** Signs out everywhere else; with no token, everywhere. */
export function endOtherSessions(userId: number, keepToken?: string) {
	getDb()
		.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?')
		.run(userId, keepToken ? hashToken(keepToken) : '');
}

/** Removes the account; sessions and list entries go with it. */
export function deleteUser(userId: number) {
	getDb().prepare('DELETE FROM users WHERE id = ?').run(userId);
}

export function setAdmin(userId: number, on: boolean) {
	getDb().prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(on ? 1 : 0, userId);
}

export interface UserSummary extends User {
	createdAt: number;
	entries: number;
}

/** For the admin page: newest first, optionally filtered by name. */
export function listUsers(search: string, limit = 100): UserSummary[] {
	const rows = getDb()
		.prepare(
			`SELECT u.id, u.username, u.show_adult, u.is_admin, u.created_at,
				(SELECT count(*) FROM list_entries e WHERE e.user_id = u.id) AS entries
			FROM users u WHERE u.username LIKE ? ESCAPE '\\' ORDER BY u.created_at DESC LIMIT ?`
		)
		.all(`%${search.replace(/[\\%_]/g, (c) => '\\' + c)}%`, limit) as (UserRow & {
		created_at: number;
		entries: number;
	})[];
	return rows.map((r) => ({ ...toUser(r), createdAt: r.created_at, entries: r.entries }));
}

export function userById(userId: number): User | null {
	const row = getDb().prepare('SELECT id, username, show_adult, is_admin FROM users WHERE id = ?').get(userId) as
		| UserRow
		| undefined;
	return row ? toUser(row) : null;
}

/** The user's own declaration that they are 18 or older. */
export function setShowAdult(userId: number, on: boolean) {
	getDb().prepare('UPDATE users SET show_adult = ? WHERE id = ?').run(on ? 1 : 0, userId);
}

// Site-wide brake on sign-ups (per visitor is impossible over Tor).
const signups: number[] = [];

/** Whether a new account may be made now; counts it if so. */
export function allowSignup(perHour: number): boolean {
	const hourAgo = Date.now() - 3600_000;
	while (signups.length && signups[0] < hourAgo) signups.shift();
	if (signups.length >= perHour) return false;
	signups.push(Date.now());
	return true;
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
