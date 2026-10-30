import { env } from '$env/dynamic/private';
import { CatalogUnavailable } from '../types';

// Cached AniList GraphQL client. Responses are served stale-while-revalidate,
// so pages render instantly and keep working when AniList is slow or
// rate-limits us (currently about 30 requests per minute).

const ENDPOINT = env.ANILIST_ENDPOINT || 'https://graphql.anilist.co';
const MAX_ENTRIES = 500;

interface Entry {
	data: unknown;
	expires: number;
}

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export class NotFound extends Error {}

/** What AniList last said about our rate limit, so background work can stay out of the way. */
export const budget = { remaining: 30, resetAt: 0 };

export async function request<T>(query: string, variables: Record<string, unknown>): Promise<T> {
	let res: Response;
	try {
		res = await fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
			body: JSON.stringify({ query, variables }),
			signal: AbortSignal.timeout(10_000)
		});
	} catch (e) {
		throw new CatalogUnavailable(`AniList unreachable: ${e}`);
	}

	const remaining = Number(res.headers.get('x-ratelimit-remaining'));
	if (Number.isFinite(remaining) && res.headers.has('x-ratelimit-remaining')) budget.remaining = remaining;
	if (res.status === 429) {
		budget.remaining = 0;
		budget.resetAt = Date.now() + (Number(res.headers.get('retry-after')) || 60) * 1000;
	}

	const body = await res.json().catch(() => null);
	const status = body?.errors?.[0]?.status ?? res.status;
	if (status === 404) throw new NotFound();
	if (!res.ok || !body || body.errors) {
		throw new CatalogUnavailable(body?.errors?.[0]?.message ?? `AniList responded with ${res.status}`);
	}
	return body.data as T;
}

function remember(key: string, data: unknown, ttl: number) {
	cache.delete(key);
	cache.set(key, { data, expires: Date.now() + ttl });
	if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
}

function refresh<T>(key: string, query: string, variables: Record<string, unknown>, ttl: number) {
	let pending = inflight.get(key) as Promise<T> | undefined;
	if (!pending) {
		pending = request<T>(query, variables)
			.then((data) => {
				remember(key, data, ttl);
				return data;
			})
			.finally(() => inflight.delete(key));
		inflight.set(key, pending);
	}
	return pending;
}

export async function query<T>(query: string, variables: Record<string, unknown> = {}, ttl = 5 * 60_000): Promise<T> {
	const key = query + JSON.stringify(variables);
	const hit = cache.get(key);

	if (hit) {
		if (hit.expires <= Date.now()) refresh(key, query, variables, ttl).catch(() => {});
		return hit.data as T;
	}
	return refresh<T>(key, query, variables, ttl);
}
