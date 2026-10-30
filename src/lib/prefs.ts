// Display preferences live in a cookie so the server can render the right
// theme on the first byte — no flash, and it works with JavaScript disabled.

export type Mode = 'dark' | 'light';
export type TitleLang = 'english' | 'romaji' | 'native';
export type TextSize = 'small' | 'medium' | 'large';

export interface Prefs {
	mode: Mode;
	accent: string;
	titleLang: TitleLang;
	reduceMotion: boolean;
	tz: string;
	textSize: TextSize;
	/** The catalog's sort value used on Browse when none is picked; '' for its default. */
	sort: string;
	/** The Continue Watching row on the home page. */
	showContinue: boolean;
}

export const PREFS_COOKIE = 'nuba_prefs';

export const ACCENTS = [
	{ name: 'Nuba red', value: '#ff3d68' },
	{ name: 'Sakura', value: '#ff7eb6' },
	{ name: 'Ember', value: '#ff8a3d' },
	{ name: 'Gold', value: '#f5c542' },
	{ name: 'Mint', value: '#34d399' },
	{ name: 'Ice', value: '#38bdf8' },
	{ name: 'Violet', value: '#a78bfa' },
	{ name: 'Silver', value: '#d4d4d8' }
];

export const DEFAULT_PREFS: Prefs = {
	mode: 'dark',
	accent: ACCENTS[0].value,
	titleLang: 'english',
	reduceMotion: false,
	tz: 'UTC',
	textSize: 'medium',
	sort: '',
	showContinue: true
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isHex(value: unknown): value is string {
	return typeof value === 'string' && HEX.test(value);
}

export function isTimeZone(value: unknown): value is string {
	if (typeof value !== 'string' || value.length > 64) return false;
	try {
		new Intl.DateTimeFormat('en', { timeZone: value });
		return true;
	} catch {
		return false;
	}
}

/** Merge untrusted input over a base, keeping only valid fields. */
export function sanitizePrefs(input: Record<string, unknown>, base: Prefs = DEFAULT_PREFS): Prefs {
	return {
		mode: input.mode === 'light' || input.mode === 'dark' ? input.mode : base.mode,
		accent: isHex(input.accent) ? input.accent.toLowerCase() : base.accent,
		titleLang:
			input.titleLang === 'english' || input.titleLang === 'romaji' || input.titleLang === 'native'
				? input.titleLang
				: base.titleLang,
		reduceMotion: typeof input.reduceMotion === 'boolean' ? input.reduceMotion : base.reduceMotion,
		tz: isTimeZone(input.tz) ? input.tz : base.tz,
		textSize:
			input.textSize === 'small' || input.textSize === 'medium' || input.textSize === 'large'
				? input.textSize
				: base.textSize,
		sort: typeof input.sort === 'string' && /^[A-Z_]{0,32}$/.test(input.sort) ? input.sort : base.sort,
		showContinue: typeof input.showContinue === 'boolean' ? input.showContinue : base.showContinue
	};
}

export function parsePrefs(raw: string | undefined): Prefs {
	if (!raw) return { ...DEFAULT_PREFS };
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? sanitizePrefs(parsed) : { ...DEFAULT_PREFS };
	} catch {
		return { ...DEFAULT_PREFS };
	}
}

/** Black or white, whichever reads better on the accent color. */
export function accentInk(hex: string): string {
	const n = parseInt(hex.slice(1), 16);
	const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255].map((c) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	});
	const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
	return luminance > 0.4 ? '#0a0a0c' : '#ffffff';
}

/** Attributes for the <html> element. Values are validated, so this is safe to inline. */
export function htmlAttrs(prefs: Prefs): string {
	const motion = prefs.reduceMotion ? ' data-reduce-motion' : '';
	return `data-mode="${prefs.mode}" data-text="${prefs.textSize}"${motion} style="--accent:${prefs.accent};--accent-ink:${accentInk(prefs.accent)}"`;
}
