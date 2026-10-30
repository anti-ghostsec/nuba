/** Only allow same-site paths as redirect targets. */
export function safeRedirect(value: unknown, fallback = '/'): string {
	const target = typeof value === 'string' ? value : '';
	return target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\') ? target : fallback;
}
