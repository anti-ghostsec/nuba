// Grant or remove admin rights from the command line, so nobody can make
// themselves admin through the website.
//
//   npm run admin -- <username>           make an admin
//   npm run admin -- <username> --remove  take it away
//   npm run admin -- --list               show admins

import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const file = join(resolve(process.env.NUBA_DATA_DIR || 'data'), 'nuba.db');
if (!existsSync(file)) {
	console.error(`No database at ${file}. Start Nuba once and register an account first.`);
	process.exit(1);
}
const db = new Database(file);
const hasColumn = db
	.prepare('SELECT 1 FROM pragma_table_info(?) WHERE name = ?')
	.get('users', 'is_admin');
if (!hasColumn) {
	console.error('This database is from an older Nuba. Start the new version once, then try again.');
	process.exit(1);
}

const args = process.argv.slice(2);
if (args[0] === '--list' || !args.length) {
	const admins = db.prepare('SELECT username FROM users WHERE is_admin = 1 ORDER BY username').all();
	console.log(admins.length ? admins.map((a) => a.username).join('\n') : 'No admins yet.');
	if (!args.length) console.log('\nUsage: npm run admin -- <username> [--remove]');
	process.exit(0);
}

const [username] = args;
const on = !args.includes('--remove');
const { changes } = db.prepare('UPDATE users SET is_admin = ? WHERE username = ?').run(on ? 1 : 0, username);
if (!changes) {
	console.error(`No user named "${username}".`);
	process.exit(1);
}
console.log(on ? `${username} is now an admin.` : `${username} is no longer an admin.`);
