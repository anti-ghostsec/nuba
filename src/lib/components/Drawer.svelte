<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import House from '@lucide/svelte/icons/house';
	import Search from '@lucide/svelte/icons/search';
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Settings from '@lucide/svelte/icons/settings';
	import Bookmark from '@lucide/svelte/icons/bookmark';
	import { page } from '$app/state';
	import { useAccount } from '$lib/context';
	import { SITE } from '$lib/site';
	import Logo from './Logo.svelte';
	import Preferences from './Preferences.svelte';

	const account = useAccount();
	const links = $derived([
		{ href: '/', label: 'Home', icon: House },
		{ href: '/search', label: 'Browse', icon: Search },
		{ href: '/#schedule', label: 'Schedule', icon: CalendarDays },
		...(account.user ? [{ href: '/list', label: SITE.listTitle, icon: Bookmark }] : []),
		{ href: '/settings', label: 'Settings', icon: Settings }
	]);
</script>

<!-- Opened by the #nav-toggle checkbox, so it works without JavaScript. -->
<label for="nav-toggle" class="scrim" aria-hidden="true"></label>
<nav class="drawer" aria-label="Main">
	<div class="top">
		<a href="/" aria-label="{SITE.name} home"><Logo /></a>
		<label for="nav-toggle" class="close" title="Close menu"><X size={20} /></label>
	</div>

	<div class="scroll">
		<p class="label">Browse</p>
		<ul>
			{#each links as link (link.href)}
				{@const Icon = link.icon}
				<li>
					<a href={link.href} class:active={page.url.pathname === link.href}>
						<Icon size={18} />
						{link.label}
					</a>
				</li>
			{/each}
		</ul>

		<div class="prefs">
			<Preferences compact />
		</div>
	</div>
</nav>

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: var(--scrim);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.25s;
	}
	.drawer {
		position: fixed;
		inset: 0 auto 0 0;
		z-index: 51;
		width: min(300px, 86vw);
		display: flex;
		flex-direction: column;
		background: color-mix(in srgb, var(--bg) 92%, var(--accent) 2%);
		border-right: 1px solid var(--border);
		transform: translateX(-100%);
		visibility: hidden;
		transition:
			transform 0.3s var(--ease),
			visibility 0s 0.3s;
	}
	:global(#nav-toggle:checked) ~ .scrim {
		opacity: 1;
		pointer-events: auto;
	}
	:global(#nav-toggle:checked) ~ .drawer {
		transform: none;
		visibility: visible;
		transition: transform 0.3s var(--ease);
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: var(--header-h);
		padding: 0 16px 0 20px;
	}
	.close {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius);
		color: var(--muted);
		cursor: pointer;
	}
	.close:hover {
		color: var(--text);
		background: var(--surface);
	}
	.scroll {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		padding: 8px 12px 16px;
	}
	.label {
		padding: 8px 12px;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--faint);
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li a {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 42px;
		padding: 0 12px;
		border-radius: var(--radius);
		color: var(--muted);
		transition:
			background 0.15s,
			color 0.15s;
	}
	li a:hover {
		color: var(--text);
		background: var(--surface);
	}
	li a.active {
		color: var(--text);
		background: var(--surface-2);
	}
	li a.active :global(svg) {
		color: var(--accent);
	}
	.prefs {
		margin-top: auto;
		padding-top: 20px;
		border-top: 1px solid var(--border);
	}
</style>
