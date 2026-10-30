<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { usePrefs } from '$lib/context';
	import { img, titleOf } from '$lib/format';
	import { SITE } from '$lib/site';
	import type { ListItem } from '$lib/types';

	let { entry, item }: ListItem = $props();

	const prefs = usePrefs();
	// Optimistic: bumps instantly, falls back to the saved value if the save fails.
	let progress = $derived(entry.progress);
	let saving = $state(false);

	const next = $derived(progress + 1);
	const finishes = $derived(item.total !== null && next >= item.total);
</script>

<div class="pcard">
	<a href="/title/{item.id}" class="poster" style:--ph={item.color ?? '#1b1b1f'}>
		<img src={img(item.cover)} alt="" loading="lazy" width="230" height="345" />
		<span class="bar"><span style:width="{item.total ? Math.min(100, (progress / item.total) * 100) : 0}%"></span></span>
	</a>
	<div class="row">
		<a href="/title/{item.id}" class="info">
			<span class="name">{titleOf(item, prefs.titleLang)}</span>
			<span class="meta">{SITE.unit.short} {progress}{item.total ? ` / ${item.total}` : ''}</span>
		</a>
		<form
			method="POST"
			action="/list?/save"
			use:enhance={() => {
				const before = progress;
				progress = next;
				saving = true;
				return async ({ result }) => {
					saving = false;
					if (result.type === 'success') await invalidate('nuba:library');
					else progress = before;
				};
			}}
		>
			<input type="hidden" name="itemId" value={item.id} />
			<input type="hidden" name="progress" value={next} />
			<input type="hidden" name="status" value={finishes ? 'COMPLETED' : entry.status} />
			<input type="hidden" name="redirectTo" value={page.url.pathname} />
			<button
				class="icon-btn plus"
				title={finishes ? 'Mark finished' : `Finished ${SITE.unit.one.toLowerCase()} ${next}`}
				disabled={saving}
			>
				<Plus size={17} />
			</button>
		</form>
	</div>
</div>

<style>
	.pcard {
		display: grid;
		gap: 9px;
		min-width: 0;
	}
	.poster {
		position: relative;
		display: block;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius);
		overflow: hidden;
		background: var(--ph);
	}
	.poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.bar {
		position: absolute;
		inset: auto 0 0;
		height: 4px;
		background: rgb(0 0 0 / 0.55);
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--accent);
		transition: width 0.3s var(--ease);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.info {
		flex: 1;
		min-width: 0;
		display: grid;
	}
	.name {
		font-size: 0.93rem;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta {
		font-size: 0.8rem;
		color: var(--muted);
		font-variant-numeric: tabular-nums;
	}
	.plus {
		width: 34px;
		height: 34px;
		flex-shrink: 0;
	}
	.plus:hover:not(:disabled) {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-ink);
	}
</style>
