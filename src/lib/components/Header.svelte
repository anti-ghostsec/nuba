<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import Search from '@lucide/svelte/icons/search';
	import Account from './Account.svelte';
	import { SITE } from '$lib/site';
	import Logo from './Logo.svelte';

	let { query = '' }: { query?: string } = $props();
	let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = window.scrollY > 24)} />

<header class="header" class:scrolled>
	<label for="nav-toggle" class="icon-btn menu" title="Menu"><Menu size={20} /></label>
	<a href="/" class="home" aria-label="{SITE.name} home"><Logo /></a>

	<form action="/search" class="search" role="search">
		<Search size={18} />
		<input name="q" type="search" placeholder={SITE.searchPlaceholder} value={query} autocomplete="off" />
	</form>

	<div class="actions"><Account /></div>
</header>

<style>
	.header {
		position: fixed;
		inset: 0 0 auto;
		z-index: 40;
		height: var(--header-h);
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 0 var(--gutter);
		background: linear-gradient(to bottom, rgb(0 0 0 / 0.65), transparent);
		transition: background 0.2s;
	}
	:global([data-mode='light']) .header {
		background: linear-gradient(to bottom, rgb(0 0 0 / 0.45), transparent);
	}
	.header.scrolled {
		background: color-mix(in srgb, var(--bg) 82%, transparent);
		backdrop-filter: blur(14px);
		-webkit-backdrop-filter: blur(14px);
		border-bottom: 1px solid var(--border);
	}
	/* Over the hero art the header is always light; once solid it follows the theme. */
	.header:not(.scrolled) {
		color: #fff;
	}
	.header:not(.scrolled) .icon-btn {
		border-color: rgb(255 255 255 / 0.14);
		background: rgb(20 20 24 / 0.45);
	}
	:global(#nav-toggle:focus-visible) ~ .header .menu {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.home,
	.menu {
		flex-shrink: 0;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-left: auto;
	}
	.search {
		flex: 1;
		max-width: 460px;
		margin-left: clamp(0px, 4vw, 48px);
		display: flex;
		align-items: center;
		gap: 10px;
		height: 42px;
		padding: 0 14px;
		border-radius: var(--radius);
		border: 1px solid rgb(255 255 255 / 0.12);
		background: rgb(20 20 24 / 0.5);
		color: rgb(255 255 255 / 0.7);
		transition: border-color 0.15s;
	}
	.header.scrolled .search {
		border-color: var(--border);
		background: var(--surface);
		color: var(--muted);
	}
	.search:focus-within {
		border-color: var(--accent);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: none;
		color: inherit;
	}
	.header:not(.scrolled) .search input {
		color: #fff;
	}
	.search input::placeholder {
		color: inherit;
	}
	@media (max-width: 560px) {
		.header {
			gap: 10px;
		}
		.home :global(.word) {
			display: none;
		}
		.search {
			margin-left: 0;
		}
	}
</style>
