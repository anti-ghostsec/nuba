import type { Item, ListEntry, ListItem, ListStatus } from '$lib/types';
import { getDb } from './db';

// Users' lists, stored by Nuba. Each entry keeps a snapshot of the item
// (title, cover…) so lists render without asking the catalog, and keep
// working if the catalog is swapped or offline.

interface Row {
	item_id: string;
	status: ListStatus;
	progress: number;
	updated_at: number;
	snapshot: string;
}

const toListItem = (row: Row): ListItem => ({
	entry: { itemId: row.item_id, status: row.status, progress: row.progress, updatedAt: row.updated_at },
	item: JSON.parse(row.snapshot)
});

export function listFor(userId: number): ListItem[] {
	const rows = getDb()
		.prepare('SELECT item_id, status, progress, updated_at, snapshot FROM list_entries WHERE user_id = ? ORDER BY updated_at DESC')
		.all(userId) as Row[];
	return rows.map(toListItem);
}

export function entryFor(userId: number, itemId: string): ListEntry | null {
	const row = getDb()
		.prepare('SELECT item_id, status, progress, updated_at, snapshot FROM list_entries WHERE user_id = ? AND item_id = ?')
		.get(userId, itemId) as Row | undefined;
	return row ? toListItem(row).entry : null;
}

export function saveEntry(userId: number, item: Item, status: ListStatus, progress: number): ListEntry {
	// Keep only the card fields, even if we were handed a full ItemDetail.
	const { id, title, altTitles, cover, coverLarge, color, banner, kind, year, score, tags, total } = item;
	const snapshot: Item = { id, title, altTitles, cover, coverLarge, color, banner, kind, year, score, tags, total, summary: null };
	const updatedAt = Date.now();
	getDb()
		.prepare(
			`INSERT INTO list_entries (user_id, item_id, status, progress, updated_at, snapshot)
			 VALUES (?, ?, ?, ?, ?, ?)
			 ON CONFLICT (user_id, item_id) DO UPDATE SET
				status = excluded.status, progress = excluded.progress,
				updated_at = excluded.updated_at, snapshot = excluded.snapshot`
		)
		.run(userId, item.id, status, progress, updatedAt, JSON.stringify(snapshot));
	return { itemId: item.id, status, progress, updatedAt };
}

export function removeEntry(userId: number, itemId: string) {
	getDb().prepare('DELETE FROM list_entries WHERE user_id = ? AND item_id = ?').run(userId, itemId);
}

export function clearList(userId: number) {
	getDb().prepare('DELETE FROM list_entries WHERE user_id = ?').run(userId);
}
