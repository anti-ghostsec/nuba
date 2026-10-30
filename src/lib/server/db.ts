import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { env } from '$env/dynamic/private';

// Nuba's own database: accounts, sessions and lists. One SQLite file in
// NUBA_DATA_DIR. Opened lazily so builds never touch it.

const MIGRATIONS = [
	`
	CREATE TABLE users (
		id INTEGER PRIMARY KEY,
		username TEXT NOT NULL UNIQUE COLLATE NOCASE,
		password_hash TEXT NOT NULL,
		created_at INTEGER NOT NULL
	);
	CREATE TABLE sessions (
		id TEXT PRIMARY KEY,
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		expires_at INTEGER NOT NULL
	);
	CREATE INDEX sessions_user ON sessions(user_id);
	CREATE TABLE list_entries (
		user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
		item_id TEXT NOT NULL,
		status TEXT NOT NULL,
		progress INTEGER NOT NULL DEFAULT 0,
		updated_at INTEGER NOT NULL,
		snapshot TEXT NOT NULL,
		PRIMARY KEY (user_id, item_id)
	);
	`
];

let db: Database.Database | undefined;

export function getDb(): Database.Database {
	if (db) return db;

	const dir = resolve(env.NUBA_DATA_DIR || 'data');
	mkdirSync(dir, { recursive: true });
	db = new Database(join(dir, 'nuba.db'));
	db.pragma('journal_mode = WAL');
	db.pragma('foreign_keys = ON');

	const version = db.pragma('user_version', { simple: true }) as number;
	for (let i = version; i < MIGRATIONS.length; i++) {
		db.transaction(() => {
			db!.exec(MIGRATIONS[i]);
			db!.pragma(`user_version = ${i + 1}`);
		})();
	}
	return db;
}
