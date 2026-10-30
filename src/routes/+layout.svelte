<script lang="ts">
	import '@fontsource-variable/inter';
	import '../app.css';
	import { onMount } from 'svelte';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { provideAccount, providePrefs } from '$lib/context';
	import { PREFS_COOKIE, accentInk } from '$lib/prefs';
	import { SITE } from '$lib/site';
	import Header from '$lib/components/Header.svelte';
	import Drawer from '$lib/components/Drawer.svelte';

	let { data, children } = $props();

	// Seeded once from the cookie; after that the browser owns it.
	// svelte-ignore state_referenced_locally
	const prefs = $state({ ...data.prefs });
	providePrefs(prefs);
	provideAccount({
		get user() {
			return data.user;
		},
		get library() {
			return data.library;
		}
	});

	let navOpen = $state(false);

	$effect(() => {
		const root = document.documentElement;
		root.dataset.mode = prefs.mode;
		root.dataset.text = prefs.textSize;
		root.style.setProperty('--accent', prefs.accent);
		root.style.setProperty('--accent-ink', accentInk(prefs.accent));
		root.toggleAttribute('data-reduce-motion', prefs.reduceMotion);
		const value = encodeURIComponent(JSON.stringify(prefs));
		document.cookie = `${PREFS_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
	});

	onMount(() => {
		const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
		if (tz && tz !== prefs.tz) prefs.tz = tz;
	});

	afterNavigate(() => (navOpen = false));

	// Cross-fade between pages where the browser supports it.
	onNavigate((navigation) => {
		if (!document.startViewTransition || prefs.reduceMotion || navigation.from?.url.href === navigation.to?.url.href) return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && (navOpen = false)} />

<input type="checkbox" id="nav-toggle" class="sr-only" bind:checked={navOpen} aria-label="Menu" />
<Header query={page.url.searchParams.get('q') ?? ''} />
<Drawer />

<main class:overlap={page.route.id === '/' || page.route.id === '/title/[id]'}>
	{@render children()}
</main>

<footer class="footer container">
	<span>{SITE.name} · data from <a href={data.source.url} rel="noreferrer">{data.source.name}</a></span>
	<span class="faint">Not affiliated with {data.source.name}.</span>
</footer>

<style>
	main {
		padding-top: var(--header-h);
		min-height: 70vh;
	}
	main.overlap {
		padding-top: 0;
	}
	.footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 8px;
		padding-top: 48px;
		padding-bottom: 32px;
		color: var(--muted);
		font-size: 0.85rem;
	}
	.footer a {
		color: var(--text);
	}
	.faint {
		color: var(--faint);
	}
</style>
