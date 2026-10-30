<script lang="ts" generics="T extends { id: string }">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { onMount, type Snippet } from 'svelte';
	import type { Item } from '$lib/types';
	import Card from './Card.svelte';

	let { title, items, card }: { title: string; items: T[]; card?: Snippet<[T]> } = $props();

	let track: HTMLDivElement;
	let ready = $state(false);
	let atStart = $state(true);
	let atEnd = $state(false);

	function update() {
		atStart = track.scrollLeft < 8;
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
	}

	onMount(() => {
		ready = true;
		update();
	});
</script>

<section class="row">
	<div class="head">
		<h2 class="section-title">{title}</h2>
		{#if ready}
			<div class="arrows">
				<button class="icon-btn" aria-label="Scroll left" disabled={atStart} onclick={() => track.scrollBy({ left: -track.clientWidth * 0.9 })}>
					<ChevronLeft size={18} />
				</button>
				<button class="icon-btn" aria-label="Scroll right" disabled={atEnd} onclick={() => track.scrollBy({ left: track.clientWidth * 0.9 })}>
					<ChevronRight size={18} />
				</button>
			</div>
		{/if}
	</div>
	<div class="scroller" bind:this={track} onscroll={update}>
		{#each items as entry (entry.id)}
			<div class="item">
				{#if card}{@render card(entry)}{:else}<Card item={entry as unknown as Item} />{/if}
			</div>
		{/each}
	</div>
</section>

<svelte:window onresize={() => ready && update()} />

<style>
	.row {
		display: grid;
		gap: 16px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.arrows {
		display: flex;
		gap: 8px;
	}
	.arrows .icon-btn {
		width: 32px;
		height: 32px;
	}
	.item {
		flex: 0 0 clamp(132px, 15vw, 190px);
		min-width: 0;
	}
</style>
