<script lang="ts">
	import { useAccount, usePrefs } from '$lib/context';
	import { img, score, titleOf } from '$lib/format';
	import { SITE } from '$lib/site';
	import type { Item } from '$lib/types';

	let { item }: { item: Item } = $props();

	const prefs = usePrefs();
	const account = useAccount();
	const entry = $derived(account.library[item.id]);
	const title = $derived(titleOf(item, prefs.titleLang));
	const rating = $derived(score(item.score));
</script>

<a class="card" href="/title/{item.id}" style:--ph={item.color ?? '#1b1b1f'}>
	<div class="poster">
		<img src={img(item.cover)} alt="" loading="lazy" decoding="async" width="230" height="345" />
		{#if rating}<span class="score">{rating}</span>{/if}
		{#if entry}<span class="status">{SITE.statuses[entry.status]}</span>{/if}
	</div>
	<p class="name" {title}>{title}</p>
	<p class="meta">{[item.kind, item.year].filter(Boolean).join(' • ')}</p>
</a>

<style>
	.card {
		display: block;
		min-width: 0;
	}
	.poster {
		position: relative;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius);
		overflow: hidden;
		/* The cover's dominant color fills the space until the image arrives. */
		background: var(--ph);
	}
	.poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.4s var(--ease);
	}
	.poster::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.06);
		transition: box-shadow 0.2s;
	}
	.card:hover .poster img {
		transform: scale(1.04);
	}
	.card:hover .poster::after {
		box-shadow: inset 0 0 0 2px var(--accent);
	}
	.score {
		position: absolute;
		top: 8px;
		right: 8px;
		padding: 2px 7px;
		border-radius: 6px;
		background: rgb(10 10 12 / 0.78);
		backdrop-filter: blur(4px);
		color: #f5c542;
		font-size: 0.76rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	.status {
		position: absolute;
		top: 8px;
		left: 8px;
		padding: 2px 7px;
		border-radius: 6px;
		background: var(--accent);
		color: var(--accent-ink);
		font-size: 0.72rem;
		font-weight: 600;
	}
	.name {
		margin-top: 9px;
		font-size: 0.93rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.15s;
	}
	.card:hover .name {
		color: var(--accent);
	}
	.meta {
		margin-top: 2px;
		font-size: 0.8rem;
		color: var(--muted);
	}
</style>
