import type { Prefs } from '$lib/prefs';
import type { User } from '$lib/types';

declare global {
	namespace App {
		interface Locals {
			prefs: Prefs;
			user: User | null;
		}
	}
}

export {};
