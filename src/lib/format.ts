import type { TitleLang } from './prefs';
import type { Item } from './types';

export function titleOf(item: Item, lang: TitleLang): string {
	return item.altTitles[lang] ?? item.title;
}

export function score(value: number | null): string | null {
	return value ? value.toFixed(1) : null;
}

/** Strip the light HTML some sources put in descriptions. */
export function stripHtml(html: string | null, max = Infinity): string {
	if (!html) return '';
	const text = html
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '')
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
	return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

/** Route catalog images through our own server (see routes/img). */
export function img(url: string | null): string {
	return url ? `/img?u=${encodeURIComponent(url)}` : '';
}
