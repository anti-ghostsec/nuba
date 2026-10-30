<script lang="ts">
	import { img } from '$lib/format';

	// A picked picture, or the username's first letter on the accent color.
	let {
		username,
		image = null,
		size = 36,
		ring = false
	}: { username: string; image?: string | null; size?: number; ring?: boolean } = $props();
</script>

<span class="avatar" class:ring style:--size="{size}px" aria-hidden="true">
	{#if image}
		<img src={img(image)} alt="" width={size} height={size} />
	{:else}
		{username.charAt(0).toUpperCase()}
	{/if}
</span>

<style>
	.avatar {
		display: inline-grid;
		place-items: center;
		flex-shrink: 0;
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		overflow: hidden;
		background: var(--accent);
		color: var(--accent-ink);
		font-weight: 700;
		font-size: calc(var(--size) * 0.42);
	}
	.avatar.ring {
		box-shadow:
			0 0 0 3px var(--bg),
			0 0 0 6px var(--accent);
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
