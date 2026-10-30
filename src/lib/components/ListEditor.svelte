<script lang="ts">
	import type { SubmitFunction } from '@sveltejs/kit';
	import Check from '@lucide/svelte/icons/check';
	import LogIn from '@lucide/svelte/icons/log-in';
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { useAccount } from '$lib/context';
	import { SITE, STATUSES } from '$lib/site';
	import type { ListStatus } from '$lib/types';

	let { itemId, total }: { itemId: string; total: number | null } = $props();

	const account = useAccount();
	const entry = $derived(account.library[itemId] ?? null);

	// Editable copies that reset whenever the saved entry changes.
	let status = $derived<ListStatus>(entry?.status ?? 'CURRENT');
	let progress = $derived(entry?.progress ?? 0);
	let busy = $state(false);
	let message = $state('');

	const max = $derived(total ?? 100_000);
	const dirty = $derived(!entry || status !== entry.status || progress !== entry.progress);

	function step(by: number) {
		progress = Math.min(max, Math.max(0, progress + by));
		if (total && progress === total && (status === 'CURRENT' || status === 'PLANNING')) status = 'COMPLETED';
		if (progress > 0 && status === 'PLANNING') status = 'CURRENT';
	}

	const submit: SubmitFunction = () => {
		busy = true;
		message = '';
		return async ({ result, update }) => {
			busy = false;
			if (result.type === 'success') message = 'Saved';
			else if (result.type === 'failure') message = String(result.data?.message ?? 'Something went wrong');
			await update({ reset: false });
		};
	};
</script>

<section class="editor panel">
	{#if account.user}
		<form method="POST" action="/list?/save" use:enhance={submit}>
			<input type="hidden" name="itemId" value={itemId} />
			<input type="hidden" name="redirectTo" value={page.url.pathname} />

			<label class="field">
				<span>Status</span>
				<select name="status" bind:value={status}>
					{#each STATUSES as s (s)}<option value={s}>{SITE.statuses[s]}</option>{/each}
				</select>
			</label>

			<div class="field">
				<label for="progress-{itemId}">{SITE.unit.many} done</label>
				<div class="stepper">
					<button type="button" class="icon-btn" aria-label="One less" onclick={() => step(-1)}><Minus size={16} /></button>
					<input id="progress-{itemId}" name="progress" type="number" min="0" {max} bind:value={progress} />
					<span class="of">{total ? `/ ${total}` : ''}</span>
					<button type="button" class="icon-btn" aria-label="One more" onclick={() => step(1)}><Plus size={16} /></button>
				</div>
			</div>

			<div class="actions">
				<button class="btn primary" disabled={busy || !dirty}>
					{#if !dirty && entry}<Check size={17} /> On your list{:else}{entry ? 'Save changes' : 'Add to list'}{/if}
				</button>
				{#if entry}
					<button class="link" formaction="/list?/remove" disabled={busy}>Remove</button>
				{/if}
			</div>
			{#if message}<p class="msg" role="status">{message}</p>{/if}
		</form>
	{:else}
		<p class="hint">Keep track of what you're watching.</p>
		<a class="btn primary" href="/login?next={encodeURIComponent(page.url.pathname)}"><LogIn size={17} /> Sign in to add</a>
	{/if}
</section>

<style>
	.editor {
		padding: 18px;
	}
	form {
		display: grid;
		gap: 14px;
	}
	.field {
		display: grid;
		gap: 6px;
	}
	.field > span,
	.field > label {
		font-size: 0.75rem;
		color: var(--faint);
	}
	select,
	.stepper input {
		height: 40px;
		padding: 0 10px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface-2);
	}
	select:focus,
	.stepper input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.stepper {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.stepper input {
		width: 64px;
		text-align: center;
		font-variant-numeric: tabular-nums;
		-moz-appearance: textfield;
		appearance: textfield;
	}
	.stepper input::-webkit-inner-spin-button {
		-webkit-appearance: none;
	}
	.of {
		flex: 1;
		color: var(--muted);
		font-size: 0.9rem;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 12px;
	}
	.actions .btn {
		flex: 1;
		justify-content: center;
	}
	.btn:disabled {
		opacity: 0.7;
		cursor: default;
	}
	.link {
		border: 0;
		background: none;
		color: var(--muted);
		font-size: 0.88rem;
		cursor: pointer;
	}
	.link:hover {
		color: var(--accent);
	}
	.msg,
	.hint {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.hint {
		margin-bottom: 12px;
	}
	.editor > .btn {
		width: 100%;
		justify-content: center;
	}
</style>
