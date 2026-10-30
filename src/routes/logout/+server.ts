import { redirect } from '@sveltejs/kit';
import { endSession } from '$lib/server/users';
import type { RequestHandler } from './$types';

// POST only, so a link on another site can't sign people out.
export const POST: RequestHandler = ({ cookies }) => {
	endSession(cookies);
	redirect(303, '/');
};
