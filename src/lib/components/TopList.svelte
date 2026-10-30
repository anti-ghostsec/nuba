<script lang="ts">
	import Star from '@lucide/svelte/icons/star';
	import { usePrefs } from '$lib/context';
	import { img, score, titleOf } from '$lib/format';
	import type { Item } from '$lib/types';

	let { title, items }: { title: string; items: Item[] } = $props();

	const prefs = usePrefs();
</script>

<section class="top">
	<h2 class="section-title">{title}</h2>
	<ol>
		{#each items as m, i (m.id)}
			<li>
				<a href="/title/{m.id}">
					<span class="rank" class:podium={i < 3}>{String(i + 1).padStart(2, '0')}</span>
					<img src={img(m.cover)} alt="" loading="lazy" width="44" height="62" style:background={m.color ?? 'var(--surface-2)'} />
					<span class="info">
						<span class="name">{titleOf(m, prefs.titleLang)}</span>
						<span class="meta">{[m.kind, ...m.tags.slice(0, 2)].filter(Boolean).join(' · ')}</span>
					</span>
					{#if m.score}
						<span class="score"><Star size={13} fill="currentColor" />{score(m.score)}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ol>
</section>

<style>
	.top {
		display: grid;
		gap: 16px;
		align-content: start;
	}
	ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}
	a {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 8px 14px 8px 8px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		transition: border-color 0.15s;
	}
	a:hover {
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
	}
	.rank {
		width: 32px;
		text-align: center;
		font-size: 1.15rem;
		font-weight: 800;
		color: var(--faint);
		font-variant-numeric: tabular-nums;
	}
	.rank.podium {
		color: var(--accent);
	}
	img {
		width: 44px;
		height: 62px;
		flex-shrink: 0;
		border-radius: 6px;
		object-fit: cover;
	}
	.info {
		flex: 1;
		min-width: 0;
		display: grid;
	}
	.name {
		font-size: 0.92rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 0.78rem;
		color: var(--muted);
	}
	.score {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--gold);
		font-variant-numeric: tabular-nums;
	}
</style>
