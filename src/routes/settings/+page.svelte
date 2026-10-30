<script lang="ts">
	import { SITE } from '$lib/site';
	import Preferences from '$lib/components/Preferences.svelte';
</script>

<svelte:head><title>Settings · {SITE.name}</title></svelte:head>

<div class="container page">
	<h1 class="section-title">Settings</h1>
	<section class="panel">
		<h2>Appearance</h2>
		<p class="hint">Saved in this browser only. Nothing is sent anywhere.</p>
		<Preferences />
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
</style>
