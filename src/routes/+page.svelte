<script lang="ts">
	import Hero from '$lib/components/Hero.svelte';
	import ProgressCard from '$lib/components/ProgressCard.svelte';
	import Row from '$lib/components/Row.svelte';
	import Schedule from '$lib/components/Schedule.svelte';
	import TopList from '$lib/components/TopList.svelte';
	import { SITE } from '$lib/site';

	let { data } = $props();

	// Row keys its items by id, so hand it the list items under their item's id.
	const watching = $derived(
		data.list.filter((l) => l.entry.status === 'CURRENT').map((l) => ({ id: l.item.id, ...l }))
	);
</script>

<svelte:head>
	<title>{SITE.name} · {SITE.tagline}</title>
	<meta name="description" content={SITE.description} />
</svelte:head>

{#if data.feed.hero.length}<Hero items={data.feed.hero} />{:else}<div class="spacer"></div>{/if}

<div class="container sections">
	{#if watching.length}
		<Row title={SITE.continueTitle} items={watching}>
			{#snippet card(l)}<ProgressCard entry={l.entry} item={l.item} />{/snippet}
		</Row>
	{/if}

	{#each data.feed.rows as row (row.title)}
		<Row title={row.title} items={row.items} />
	{/each}

	{#if data.feed.schedule || data.feed.ranked}
		<div class="split">
			{#if data.feed.schedule}<Schedule items={data.feed.schedule} now={data.now} />{/if}
			{#if data.feed.ranked}<TopList title={data.feed.ranked.title} items={data.feed.ranked.items} />{/if}
		</div>
	{/if}
</div>

<style>
	.spacer {
		height: var(--header-h);
	}
	.sections {
		display: grid;
		gap: clamp(36px, 5vw, 56px);
		margin-top: 8px;
	}
	.split {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 380px), 1fr));
		gap: clamp(24px, 4vw, 48px);
	}
</style>
