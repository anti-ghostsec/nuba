<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import { onMount } from 'svelte';
	import type { Filter } from '$lib/types';

	// A dropdown with a search box for long option lists (tags, studios).
	// Built on <details> and real checkboxes/radios, so it works without
	// JavaScript as part of the surrounding form.

	let { filter, selected }: { filter: Filter; selected: string[] } = $props();

	let open = $state(false);
	let find = $state('');
	let root: HTMLDetailsElement;
	let enhanced = $state(false);
	onMount(() => (enhanced = true));

	const summary = $derived(
		selected.length === 0
			? 'Any'
			: selected.length === 1
				? (filter.options.find((o) => o.value === selected[0])?.label ?? selected[0])
				: `${selected.length} selected`
	);
	const needle = $derived(find.trim().toLowerCase());
	// Picked ones first, so they're easy to untick.
	const options = $derived(
		[...filter.options].sort((a, b) => Number(selected.includes(b.value)) - Number(selected.includes(a.value)))
	);

	function outside(e: MouseEvent) {
		if (open && !root.contains(e.target as Node)) open = false;
	}
</script>

<svelte:window onclick={outside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<details class="picker" bind:open bind:this={root}>
	<summary>
		<span class="value" class:set={selected.length}>{summary}</span>
		<ChevronDown size={16} />
	</summary>
	<div class="menu">
		{#if enhanced}
			<!-- No name: only filters the list, never sent with the form. -->
			<input class="find" type="search" placeholder="Find…" bind:value={find} aria-label="Find {filter.label}" />
		{/if}
		<div class="list">
			{#if !filter.multi}
				<label class="opt">
					<input type="radio" name={filter.key} value="" checked={!selected.length} onchange={() => (open = false)} />
					<span>Any</span>
				</label>
			{/if}
			{#each options as o (o.value)}
				<label class="opt" hidden={!!needle && !o.label.toLowerCase().includes(needle)}>
					<input
						type={filter.multi ? 'checkbox' : 'radio'}
						name={filter.key}
						value={o.value}
						checked={selected.includes(o.value)}
						onchange={() => !filter.multi && (open = false)}
					/>
					<span>{o.label}</span>
				</label>
			{/each}
		</div>
	</div>
</details>

<style>
	.picker {
		position: relative;
	}
	summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		height: 42px;
		padding: 0 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
		list-style: none;
		transition: border-color 0.15s;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.picker[open] summary,
	summary:focus-visible {
		border-color: var(--accent);
		outline: 0;
	}
	.picker[open] summary :global(svg) {
		transform: rotate(180deg);
	}
	.value {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		color: var(--text);
	}
	.menu {
		position: absolute;
		z-index: 20;
		top: calc(100% + 6px);
		left: 0;
		width: max(100%, 240px);
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		box-shadow: 0 16px 40px rgb(0 0 0 / 0.45);
		overflow: hidden;
	}
	.find {
		width: 100%;
		height: 40px;
		padding: 0 12px;
		border: 0;
		border-bottom: 1px solid var(--border);
		background: none;
		color: var(--text);
		outline: 0;
	}
	.list {
		max-height: 300px;
		overflow-y: auto;
		padding: 6px;
		overscroll-behavior: contain;
	}
	.opt {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 7px 8px;
		border-radius: 7px;
		font-size: 0.9rem;
		color: var(--muted);
		cursor: pointer;
	}
	.opt[hidden] {
		display: none;
	}
	.opt:hover {
		background: var(--surface-2);
		color: var(--text);
	}
	.opt input {
		accent-color: var(--accent);
		width: 15px;
		height: 15px;
		margin: 0;
	}
	.opt input:checked + span {
		color: var(--text);
	}
</style>
