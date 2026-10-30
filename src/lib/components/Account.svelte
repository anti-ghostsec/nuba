<script lang="ts">
	import LogIn from '@lucide/svelte/icons/log-in';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { useAccount } from '$lib/context';
	import { SITE } from '$lib/site';

	const account = useAccount();
	let menu = $state<HTMLDetailsElement>();

	const next = $derived(page.url.pathname === '/' ? '' : `?next=${encodeURIComponent(page.url.pathname + page.url.search)}`);

	afterNavigate(() => menu?.removeAttribute('open'));
</script>

<svelte:window
	onclick={(e) => menu?.open && !menu.contains(e.target as Node) && menu.removeAttribute('open')}
	onkeydown={(e) => e.key === 'Escape' && menu?.removeAttribute('open')}
/>

{#if account.user}
	{@const user = account.user}
	<!-- <details> gives a working dropdown even without JavaScript. -->
	<details class="account" bind:this={menu}>
		<summary aria-label="Account menu">
			<span class="avatar" aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span>
		</summary>
		<div class="menu panel">
			<p class="who">{user.username}</p>
			<a href="/list">{SITE.listTitle}</a>
			<a href="/settings">Settings</a>
			<form method="POST" action="/logout">
				<button>Sign out</button>
			</form>
		</div>
	</details>
{:else if page.route.id !== '/login' && page.route.id !== '/register'}
	<a class="btn ghost signin" href="/login{next}"><LogIn size={17} /> Sign in</a>
{/if}

<style>
	.account {
		position: relative;
		flex-shrink: 0;
	}
	summary {
		list-style: none;
		cursor: pointer;
		border-radius: 50%;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 45%, #000));
		color: var(--accent-ink);
		font-weight: 700;
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent);
	}
	.menu {
		position: absolute;
		right: 0;
		top: calc(100% + 10px);
		width: 210px;
		padding: 6px;
		display: grid;
		color: var(--text);
		box-shadow: 0 16px 40px rgb(0 0 0 / 0.35);
	}
	.who {
		padding: 8px 10px 10px;
		margin-bottom: 4px;
		font-weight: 600;
		border-bottom: 1px solid var(--border);
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.menu a,
	.menu button {
		display: block;
		width: 100%;
		padding: 8px 10px;
		border: 0;
		border-radius: 7px;
		background: none;
		text-align: left;
		font-size: 0.92rem;
		color: var(--muted);
		cursor: pointer;
	}
	.menu a:hover,
	.menu button:hover {
		background: var(--surface-2);
		color: var(--text);
	}
	.signin {
		flex-shrink: 0;
		height: 40px;
		padding: 0 14px;
	}
	@media (max-width: 560px) {
		.signin {
			padding: 0 11px;
			font-size: 0;
			gap: 0;
		}
	}
</style>
