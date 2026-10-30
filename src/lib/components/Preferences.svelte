<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Pipette from '@lucide/svelte/icons/pipette';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { usePrefs } from '$lib/context';
	import { ACCENTS } from '$lib/prefs';
	import { SITE } from '$lib/site';

	let { compact = false }: { compact?: boolean } = $props();

	const prefs = usePrefs();
	const isPreset = $derived(ACCENTS.some((a) => a.value === prefs.accent));

	// With JavaScript, every control applies instantly. Without it, the form
	// posts to /settings and the server stores the cookie.
	let enhanced = $state(false);
	onMount(() => (enhanced = true));
</script>

<form method="POST" action="/settings?/prefs" class="prefs" class:compact onsubmit={(e) => enhanced && e.preventDefault()}>
	<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />

	<fieldset>
		<legend>Mode</legend>
		<div class="segmented">
			{#each ['dark', 'light'] as mode (mode)}
				<label>
					<input type="radio" name="mode" value={mode} bind:group={prefs.mode} />
					<span>{mode === 'dark' ? 'Dark' : 'Light'}</span>
				</label>
			{/each}
		</div>
	</fieldset>

	<fieldset>
		<legend>Accent</legend>
		<div class="swatches">
			{#each ACCENTS as accent (accent.value)}
				<label class="swatch" style:--c={accent.value} title={accent.name}>
					<input type="radio" name="accent" value={accent.value} bind:group={prefs.accent} />
					<span><Check size={14} strokeWidth={3} /></span>
					<span class="sr-only">{accent.name}</span>
				</label>
			{/each}
			<label class="swatch custom" style:--c={isPreset ? 'transparent' : prefs.accent} title="Custom color">
				<input type="radio" name="accent" value="custom" checked={!isPreset} tabindex="-1" />
				<span><Pipette size={14} /></span>
				<input
					type="color"
					name="accentCustom"
					aria-label="Custom accent color"
					value={prefs.accent}
					oninput={(e) => (prefs.accent = e.currentTarget.value)}
				/>
			</label>
		</div>
	</fieldset>

	{#if SITE.titleLanguages}
	<fieldset>
		<legend>Title language</legend>
		<div class="segmented">
			{#each [['english', 'EN'], ['romaji', 'Romaji'], ['native', 'Native']] as [value, label] (value)}
				<label>
					<input type="radio" name="titleLang" {value} bind:group={prefs.titleLang} />
					<span>{label}</span>
				</label>
			{/each}
		</div>
	</fieldset>
	{/if}

	<label class="toggle">
		<span>Reduce motion</span>
		<input type="checkbox" name="reduceMotion" role="switch" bind:checked={prefs.reduceMotion} />
		<span class="track" aria-hidden="true"></span>
	</label>

	{#if !enhanced}
		<button class="btn ghost apply">Apply</button>
	{/if}
</form>

<style>
	.prefs {
		display: grid;
		gap: 18px;
	}
	.prefs.compact {
		gap: 14px;
		padding: 0 4px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
		min-width: 0;
	}
	legend {
		margin-bottom: 8px;
		padding: 0;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--faint);
	}
	input[type='radio'],
	.toggle input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.segmented {
		display: flex;
		padding: 4px;
		gap: 4px;
		border-radius: var(--radius);
		background: var(--surface);
		border: 1px solid var(--border);
	}
	.segmented label {
		flex: 1;
		position: relative;
	}
	.segmented span {
		display: grid;
		place-items: center;
		height: 34px;
		border-radius: 7px;
		font-size: 0.88rem;
		color: var(--muted);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.segmented input:checked + span {
		background: var(--surface-2);
		color: var(--text);
		box-shadow: inset 0 0 0 1px var(--border);
	}
	.segmented input:focus-visible + span,
	.swatch input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
	}
	.swatch {
		position: relative;
		cursor: pointer;
	}
	.swatch > span:first-of-type {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		background: var(--c);
		color: transparent;
		box-shadow: 0 0 0 2px var(--bg);
		transition: transform 0.15s var(--ease);
	}
	.swatch:hover > span:first-of-type {
		transform: scale(1.1);
	}
	.swatch input:checked + span {
		color: var(--accent-ink);
		box-shadow:
			0 0 0 2px var(--bg),
			0 0 0 4px var(--c);
	}
	.custom > span:first-of-type {
		background: var(--c);
		border: 1px dashed var(--faint);
		color: var(--muted);
	}
	.custom input:checked + span {
		color: var(--accent-ink);
		border-color: transparent;
	}
	.custom input[type='color'] {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		border: 0;
		padding: 0;
	}

	.toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		cursor: pointer;
		font-size: 0.92rem;
	}
	.toggle .track {
		position: relative;
		width: 40px;
		height: 22px;
		border-radius: 11px;
		background: var(--surface-2);
		border: 1px solid var(--border);
		transition: background 0.2s;
	}
	.toggle .track::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--muted);
		transition:
			transform 0.2s var(--ease),
			background 0.2s;
	}
	.toggle input:checked + .track {
		background: var(--accent);
		border-color: var(--accent);
	}
	.toggle input:checked + .track::after {
		transform: translateX(18px);
		background: var(--accent-ink);
	}
	.toggle input:focus-visible + .track {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	.apply {
		justify-content: center;
	}
</style>
