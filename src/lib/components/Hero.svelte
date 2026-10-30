<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Info from '@lucide/svelte/icons/info';
	import { onMount } from 'svelte';
	import { usePrefs } from '$lib/context';
	import { img, titleOf } from '$lib/format';
	import type { Item } from '$lib/types';

	let { items }: { items: Item[] } = $props();

	const prefs = usePrefs();
	let track: HTMLDivElement;
	let index = $state(0);
	let ready = $state(false);
	let paused = $state(false);

	function go(i: number) {
		index = (i + items.length) % items.length;
		track.scrollTo({ left: track.clientWidth * index, behavior: prefs.reduceMotion ? 'instant' : 'smooth' });
	}

	onMount(() => {
		ready = true;
		const timer = setInterval(() => {
			if (!paused && !prefs.reduceMotion && !document.hidden) go(index + 1);
		}, 7000);
		return () => clearInterval(timer);
	});
</script>

<!-- Without JavaScript this is still a swipeable, scroll-snapping carousel. -->
<section
	class="hero"
	aria-roledescription="carousel"
	aria-label="Trending now"
	onpointerenter={() => (paused = true)}
	onpointerleave={() => (paused = false)}
	onfocusin={() => (paused = true)}
	onfocusout={() => (paused = false)}
>
	<div class="track" bind:this={track} onscroll={() => (index = Math.round(track.scrollLeft / track.clientWidth))}>
		{#each items as m, i (m.id)}
			<article class="slide" aria-roledescription="slide" aria-label="{i + 1} of {items.length}" inert={ready && i !== index}>
				<img
					class="art"
					src={img(m.banner)}
					alt=""
					loading={i === 0 ? 'eager' : 'lazy'}
					fetchpriority={i === 0 ? 'high' : 'auto'}
					decoding="async"
				/>
				<div class="shade"></div>
				<div class="content container">
					<p class="kicker">#{i + 1} Trending</p>
					<h2 class="title">{titleOf(m, prefs.titleLang)}</h2>
					<p class="meta">
						{[m.kind, m.year, ...m.tags.slice(0, 3)].filter(Boolean).join(' · ')}
					</p>
					<p class="desc">{m.summary}</p>
					<a class="btn primary" href="/title/{m.id}"><Info size={18} /> Details</a>
				</div>
			</article>
		{/each}
	</div>

	{#if ready}
		<div class="controls container">
			<div class="dots">
				{#each items as m, i (m.id)}
					<button class:active={i === index} aria-label="Go to slide {i + 1}" onclick={() => go(i)}></button>
				{/each}
			</div>
			<div class="arrows">
				<button class="icon-btn round" aria-label="Previous" onclick={() => go(index - 1)}><ChevronLeft size={20} /></button>
				<button class="icon-btn round" aria-label="Next" onclick={() => go(index + 1)}><ChevronRight size={20} /></button>
			</div>
		</div>
	{/if}
</section>

<style>
	.hero {
		position: relative;
		height: clamp(420px, 72vh, 620px);
		color: #fff;
		background: #000;
	}
	.track {
		display: flex;
		height: 100%;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scrollbar-width: none;
		overscroll-behavior-x: contain;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.slide {
		position: relative;
		flex: 0 0 100%;
		scroll-snap-align: start;
		overflow: hidden;
	}
	.art {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 30%;
	}
	.shade {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(to top, var(--bg) 0%, color-mix(in srgb, var(--bg) 40%, transparent) 35%, transparent 65%),
			linear-gradient(to right, rgb(0 0 0 / 0.85) 0%, rgb(0 0 0 / 0.4) 45%, transparent 75%);
	}
	.content {
		position: absolute;
		inset: auto 0 clamp(64px, 12vh, 96px);
		display: grid;
		justify-items: start;
		gap: 10px;
	}
	.content > * {
		max-width: 560px;
	}
	.kicker {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.title {
		font-size: clamp(1.8rem, 1.2rem + 2.6vw, 3.2rem);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: -0.03em;
		text-wrap: balance;
		text-shadow: 0 2px 24px rgb(0 0 0 / 0.5);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.meta {
		font-size: 0.88rem;
		color: rgb(255 255 255 / 0.7);
	}
	.desc {
		font-size: 0.95rem;
		color: rgb(255 255 255 / 0.82);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.btn {
		margin-top: 8px;
	}
	.controls {
		position: absolute;
		inset: auto 0 24px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		pointer-events: none;
	}
	.controls > * {
		pointer-events: auto;
	}
	.dots {
		display: flex;
		gap: 6px;
	}
	.dots button {
		width: 7px;
		height: 7px;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: rgb(255 255 255 / 0.35);
		cursor: pointer;
		transition:
			width 0.3s var(--ease),
			background 0.3s;
	}
	.dots button.active {
		width: 24px;
		background: var(--accent);
	}
	.arrows {
		display: flex;
		gap: 10px;
	}
	.round {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		color: #fff;
		border-color: rgb(255 255 255 / 0.2);
		background: rgb(0 0 0 / 0.35);
		backdrop-filter: blur(6px);
	}
	.round:hover {
		background: rgb(0 0 0 / 0.6);
	}
	@media (max-width: 640px) {
		.arrows {
			display: none;
		}
		.desc {
			-webkit-line-clamp: 3;
			line-clamp: 3;
		}
	}
</style>
