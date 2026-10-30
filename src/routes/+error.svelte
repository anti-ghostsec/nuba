<script lang="ts">
	import { SITE } from '$lib/site';
	import { page } from '$app/state';
</script>

<svelte:head><title>{page.status} · {SITE.name}</title></svelte:head>

<div class="container error">
	<p class="code">{page.status}</p>
	<h1>{page.status === 404 ? 'Nothing here' : 'Something went wrong'}</h1>
	<p class="msg">{page.error?.message}</p>
	<a class="btn primary" href="/">Back home</a>
</div>

<style>
	.error {
		padding-top: 12vh;
		display: grid;
		justify-items: center;
		gap: 12px;
		text-align: center;
	}
	.code {
		font-size: 4rem;
		font-weight: 800;
		color: var(--accent);
		line-height: 1;
	}
	h1 {
		font-size: 1.5rem;
	}
	.msg {
		color: var(--muted);
		margin-bottom: 12px;
	}
</style>
