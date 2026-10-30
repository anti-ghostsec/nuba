// Production entry: reads .env (if there is one), then starts the built server.
// `npm start` runs this, so settings like ORIGIN live in one file.
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

if (!process.env.ORIGIN && !process.env.PROTOCOL_HEADER) {
	console.warn(
		'ORIGIN is not set. Without it the server assumes https://, and sign-in and other forms will be\n' +
			'rejected on a plain-http .onion address. Set ORIGIN=http://<your-address>.onion in .env.'
	);
}

await import('./build/index.js');
