<script lang="ts">
	import { enhance } from '$app/forms';
	import { useAccount } from '$lib/context';
	import { SITE } from '$lib/site';
	import Preferences from '$lib/components/Preferences.svelte';

	const account = useAccount();
</script>

<svelte:head><title>Settings · {SITE.name}</title></svelte:head>

<div class="container page">
	<h1 class="section-title">Settings</h1>
	<section class="panel">
		<h2>Appearance</h2>
		<p class="hint">Saved in this browser only. Nothing is sent anywhere.</p>
		<Preferences />
	</section>

	<section class="panel" id="content">
		<h2>Content</h2>
		{#if account.user}
			<form method="POST" action="?/content" class="row" use:enhance>
				<div>
					<p class="label">Show adult titles</p>
					<p class="hint">
						I am 18 or older. Includes adult titles in search and browsing. Off by default, and always off for anyone
						not signed in. This is a self-declaration, not age verification.
					</p>
				</div>
				<div class="switch" role="group" aria-label="Show adult titles">
					<button name="showAdult" value="0" aria-pressed={!account.user.showAdult}>Off</button>
					<button name="showAdult" value="1" aria-pressed={account.user.showAdult}>On</button>
				</div>
			</form>
		{:else}
			<p class="hint"><a href="/login?next=/settings">Sign in</a> for account settings such as adult titles.</p>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 720px;
		padding-top: 32px;
		display: grid;
		gap: 20px;
	}
	.panel {
		padding: 24px;
	}
	h2 {
		font-size: 1.05rem;
		font-weight: 600;
	}
	.hint {
		margin: 4px 0 20px;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.hint a {
		color: var(--accent);
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 20px;
		margin-top: 16px;
	}
	.row .hint {
		margin-bottom: 0;
		max-width: 46ch;
	}
	.label {
		font-size: 0.95rem;
		font-weight: 500;
	}
	.switch {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
	}
	.switch button {
		height: 34px;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}
	.switch button[aria-pressed='true'] {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--text);
	}
</style>
