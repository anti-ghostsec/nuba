import { getContext, setContext } from 'svelte';
import type { Prefs } from './prefs';
import type { ListEntry, User } from './types';

const PREFS = Symbol('prefs');
const ACCOUNT = Symbol('account');

export const providePrefs = (prefs: Prefs) => setContext(PREFS, prefs);
export const usePrefs = () => getContext<Prefs>(PREFS);

/** Signed-in state. Read through getters so it stays live after invalidation. */
export interface Account {
	readonly user: User | null;
	/** The user's entries by item id. */
	readonly library: Record<string, ListEntry>;
	/** The user's avatar picture, if they picked one. */
	readonly avatar: string | null;
}

export const provideAccount = (account: Account) => setContext(ACCOUNT, account);
export const useAccount = () => getContext<Account>(ACCOUNT);
