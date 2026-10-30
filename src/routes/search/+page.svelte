<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Card from '$lib/components/Card.svelte';
	import { SITE } from '$lib/site';

	let { data } = $props();

	const q = $derived(data.query);
	const selects = $derived(data.filters.filter((f) => !f.multi));
	const chips = $derived(data.filters.filter((f) => f.multi));
	const filtered = $derived(!!q.text || !!q.sort || Object.keys(q.filters).length > 0);
	const count = $derived(data.result.total);

	const pageHref = (n: number) => {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', String(n));
		return `/search?${params}`;
	};

	// With JavaScript every change applies at once; without it there is a button.
	let enhanced = $state(false);
	onMount(() => (enhanced = true));

	// Same as the plain form submit, minus the empty "Any" fields in the address.
	function apply(form: HTMLFormElement) {
		const params = new URLSearchParams();
		for (const [key, value] of new FormData(form)) if (value) params.append(key, String(value));
		goto(`/search?${params}`, { keepFocus: true, noScroll: true });
	}
</script>

<svelte:head><title>{q.text ? `${q.text} · Search` : 'Browse'} · {SITE.name}</title></svelte:head>

<div class="container page">
	<h1 class="section-title">
		{#if q.text}Results for <span class="q">“{q.text}”</span>{:else}Browse{/if}
		{#if count !== null}<span class="count">{count.toLocaleString()} {count === 1 ? 'title' : 'titles'}</span>{/if}
	</h1>

	<form
		class="filters"
		action="/search"
		onchange={(e) => apply(e.currentTarget)}
		onsubmit={(e) => {
			e.preventDefault();
			apply(e.currentTarget);
		}}
	>
		<div class="fields">
			<label class="field text">
				<span>Search</span>
				<span class="input">
					<Search size={16} />
					<input name="q" type="search" value={q.text} placeholder={SITE.searchPlaceholder} autocomplete="off" />
				</span>
			</label>
			{#each selects as f (f.key)}
				<label class="field">
					<span>{f.label}</span>
					<select name={f.key} value={q.filters[f.key]?.[0] ?? ''}>
						<option value="">Any</option>
						{#each f.options as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
					</select>
				</label>
			{/each}
			<label class="field">
				<span>Sort by</span>
				<select name="sort" value={q.sort}>
					<option value="">{q.text ? 'Best match' : 'Default'}</option>
					{#each data.sorts as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
				</select>
			</label>
			<div class="buttons">
				{#if !enhanced}<button class="btn primary">Apply</button>{/if}
				{#if filtered}<a class="btn ghost" href="/search">Clear</a>{/if}
			</div>
		</div>

		{#each chips as f (f.key)}
			<fieldset>
				<legend>{f.label}</legend>
				<div class="chips">
					{#each f.options as o (o.value)}
						<label class="chip">
							<input type="checkbox" name={f.key} value={o.value} checked={q.filters[f.key]?.includes(o.value)} />
							<span>{o.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		{/each}
	</form>

	{#if data.result.items.length}
		<div class="grid">
			{#each data.result.items as item (item.id)}
				<Card {item} />
			{/each}
		</div>
	{:else}
		<p class="empty">Nothing matched. Try fewer filters or a shorter search.</p>
	{/if}

	{#if q.page > 1 || data.result.hasNext}
		<nav class="pager" aria-label="Pages">
			{#if q.page > 1}<a class="btn ghost" href={pageHref(q.page - 1)}>Previous</a>{/if}
			<span class="current">Page {q.page}</span>
			{#if data.result.hasNext}<a class="btn ghost" href={pageHref(q.page + 1)}>Next</a>{/if}
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
	.count {
		margin-left: 10px;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--faint);
	}

	.filters {
		display: grid;
		gap: 18px;
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 14px;
		align-items: end;
	}
	.field {
		display: grid;
		gap: 7px;
		min-width: 0;
	}
	.field.text {
		grid-column: span 2;
	}
	.field > span:first-child,
	legend {
		font-size: 0.82rem;
		color: var(--muted);
	}
	.input,
	select {
		height: 42px;
		width: 100%;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		transition: border-color 0.15s;
	}
	.input {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 0 12px;
		color: var(--muted);
	}
	.input:focus-within,
	select:focus {
		border-color: var(--accent);
		outline: 0;
	}
	.input input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--text);
	}
	select {
		padding: 0 12px;
		cursor: pointer;
	}
	.buttons {
		display: flex;
		gap: 10px;
	}
	.buttons .btn {
		height: 42px;
	}

	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: 9px;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.chip span {
		display: inline-block;
		padding: 6px 11px;
		border-radius: 7px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}
	.chip span:hover {
		color: var(--text);
	}
	.chip input:checked + span {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--text);
	}
	.chip input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
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
		align-items: center;
		gap: 14px;
	}
	.current {
		color: var(--muted);
		font-size: 0.9rem;
	}
	@media (max-width: 560px) {
		.field.text {
			grid-column: 1 / -1;
		}
	}
</style>
