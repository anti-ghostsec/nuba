<script lang="ts">
	import Card from '$lib/components/Card.svelte';
	import { SITE } from '$lib/site';

	let { data } = $props();

	const pageHref = (n: number) => `/search?${new URLSearchParams({ ...(data.q && { q: data.q }), page: String(n) })}`;
</script>

<svelte:head><title>{data.q ? `${data.q} · Search` : 'Browse'} · {SITE.name}</title></svelte:head>

<div class="container page">
	<h1 class="section-title">
		{#if data.q}Results for <span class="q">“{data.q}”</span>{:else}Most popular{/if}
	</h1>

	{#if data.results.length}
		<div class="grid">
			{#each data.results as item (item.id)}
				<Card {item} />
			{/each}
		</div>
	{:else}
		<p class="empty">Nothing matched that search.</p>
	{/if}

	{#if data.page > 1 || data.hasNext}
		<nav class="pager" aria-label="Pages">
			{#if data.page > 1}<a class="btn ghost" href={pageHref(data.page - 1)}>Previous</a>{/if}
			{#if data.hasNext}<a class="btn ghost" href={pageHref(data.page + 1)}>Next</a>{/if}
		</nav>
	{/if}
</div>

<style>
	.page {
		padding-top: 32px;
		display: grid;
		gap: 24px;
	}
	.q {
		color: var(--accent);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 24px 16px;
	}
	.empty {
		color: var(--muted);
	}
	.pager {
		display: flex;
		justify-content: center;
		gap: 12px;
	}
</style>
