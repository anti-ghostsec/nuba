<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import ProgressCard from '$lib/components/ProgressCard.svelte';
	import { SITE, STATUSES } from '$lib/site';

	let { data } = $props();

	const groups = $derived(
		STATUSES.map((status) => ({ status, items: data.list.filter((l) => l.entry.status === status) })).filter(
			(g) => g.items.length
		)
	);
</script>

<svelte:head><title>{SITE.listTitle} · {SITE.name}</title></svelte:head>

<div class="container page">
	<h1 class="section-title">{SITE.listTitle}</h1>

	{#each groups as group (group.status)}
		<section>
			<h2>{SITE.statuses[group.status]} <span class="count">{group.items.length}</span></h2>
			<div class="grid">
				{#each group.items as l (l.item.id)}
					{#if group.status === 'CURRENT'}
						<ProgressCard entry={l.entry} item={l.item} />
					{:else}
						<Card item={l.item} />
					{/if}
				{/each}
			</div>
		</section>
	{:else}
		<p class="empty">Your list is empty. Open any title and choose "Add to list".</p>
	{/each}
</div>

<style>
	.page {
		padding-top: 32px;
		display: grid;
		gap: 36px;
	}
	section {
		display: grid;
		gap: 16px;
	}
	h2 {
		font-size: 1.1rem;
		font-weight: 600;
	}
	.count {
		margin-left: 6px;
		color: var(--faint);
		font-weight: 500;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 24px 16px;
	}
	.empty {
		color: var(--muted);
	}
</style>
