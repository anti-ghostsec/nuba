<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import Shield from '@lucide/svelte/icons/shield';
	import { enhance } from '$app/forms';
	import { useAccount } from '$lib/context';
	import { SITE } from '$lib/site';

	let { data, form } = $props();
	const account = useAccount();

	const date = (ms: number) => new Date(ms).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });

	// Destructive buttons ask first (with JavaScript; without it they just go).
	const confirmed = (text: string) => (e: SubmitEvent) => {
		if (!confirm(text)) e.preventDefault();
	};
</script>

<svelte:head><title>Admin · {SITE.name}</title></svelte:head>

<div class="container page">
	<h1 class="section-title"><Shield size={22} /> Admin</h1>

	{#if form?.message && !form.userId}<p class="note">{form.message}</p>{/if}

	<div class="grid">
		<section class="panel">
			<h2>Site</h2>
			<dl>
				{#each data.stats as s (s.label)}<div><dt>{s.label}</dt><dd>{s.value}</dd></div>{/each}
			</dl>
		</section>

		<section class="panel">
			<h2>Catalog: {data.catalog.name}</h2>
			<dl>
				{#each data.catalog.status as s (s.label)}<div><dt>{s.label}</dt><dd>{s.value}</dd></div>{/each}
			</dl>
			{#if data.catalog.canResync}
				<form method="POST" action="?/resync" use:enhance>
					<button class="btn ghost">Re-download title list</button>
				</form>
			{/if}
		</section>
	</div>

	<section class="panel users">
		<div class="head">
			<h2>Accounts</h2>
			<form class="find" role="search">
				<Search size={16} />
				<input name="q" type="search" value={data.q} placeholder="Find a username" aria-label="Find a username" />
			</form>
		</div>

		{#if data.users.length}
			<div class="table" role="table">
				<div class="tr th" role="row">
					<span role="columnheader">Username</span>
					<span role="columnheader">Joined</span>
					<span role="columnheader">On list</span>
					<span role="columnheader"><span class="sr-only">Actions</span></span>
				</div>
				{#each data.users as u (u.id)}
					<div class="tr" role="row">
						<span role="cell" class="name">
							{u.username}
							{#if u.isAdmin}<span class="tag">admin</span>{/if}
							{#if u.id === account.user?.id}<span class="tag you">you</span>{/if}
						</span>
						<span role="cell" class="muted">{date(u.createdAt)}</span>
						<span role="cell" class="muted">{u.entries}</span>
						<span role="cell" class="actions">
							<form method="POST" action="?/resetPassword" use:enhance onsubmit={confirmed(`Give ${u.username} a new random password? They will be signed out everywhere.`)}>
								<input type="hidden" name="userId" value={u.id} />
								<button class="btn ghost small">Reset password</button>
							</form>
							{#if u.id !== account.user?.id}
								<form method="POST" action="?/toggleAdmin" use:enhance>
									<input type="hidden" name="userId" value={u.id} />
									<button class="btn ghost small">{u.isAdmin ? 'Remove admin' : 'Make admin'}</button>
								</form>
								<form method="POST" action="?/deleteUser" use:enhance onsubmit={confirmed(`Delete ${u.username} and their list? This cannot be undone.`)}>
									<input type="hidden" name="userId" value={u.id} />
									<button class="btn ghost small danger">Delete</button>
								</form>
							{/if}
						</span>
						{#if form?.userId === u.id && form.message}
							<p class="row-note" class:secret={'secret' in form && form.secret} role="status">{form.message}</p>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<p class="muted">No accounts{data.q ? ' match that name' : ' yet'}.</p>
		{/if}
		{#if data.users.length === 100}<p class="muted small-print">Showing the newest 100. Search to find others.</p>{/if}
	</section>
</div>

<style>
	.page {
		padding-top: 32px;
		display: grid;
		gap: 20px;
	}
	.section-title {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.note {
		padding: 12px 16px;
		border-radius: var(--radius);
		background: var(--accent-soft);
		border: 1px solid var(--accent);
		font-size: 0.9rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
	}
	.panel {
		padding: 22px 24px;
		display: grid;
		gap: 16px;
		align-content: start;
	}
	h2 {
		font-size: 1.05rem;
		font-weight: 600;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 10px;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		font-size: 0.9rem;
	}
	dt {
		color: var(--muted);
	}
	dd {
		margin: 0;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		flex-wrap: wrap;
	}
	.find {
		display: flex;
		align-items: center;
		gap: 9px;
		height: 38px;
		width: min(260px, 100%);
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
	}
	.find:focus-within {
		border-color: var(--accent);
	}
	.find input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--text);
	}
	/* Rows share the table's columns (subgrid), so they line up whatever the buttons. */
	.table {
		display: grid;
		grid-template-columns: minmax(140px, 1fr) auto auto auto;
		column-gap: 24px;
	}
	.tr {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: subgrid;
		align-items: center;
		gap: 12px;
		padding: 10px 0;
		border-top: 1px solid var(--border);
		font-size: 0.9rem;
	}
	.th {
		border-top: 0;
		font-size: 0.75rem;
		color: var(--faint);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.name {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 500;
		min-width: 0;
	}
	.tag {
		padding: 1px 6px;
		border-radius: 5px;
		font-size: 0.68rem;
		font-weight: 600;
		background: var(--accent-soft);
		color: var(--accent);
	}
	.tag.you {
		background: var(--surface-2);
		color: var(--muted);
	}
	.muted {
		color: var(--muted);
	}
	.actions {
		display: flex;
		gap: 6px;
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.btn.small {
		height: 30px;
		padding: 0 10px;
		font-size: 0.8rem;
	}
	.btn.danger {
		color: #fb7185;
	}
	.row-note {
		grid-column: 1 / -1;
		font-size: 0.85rem;
		color: var(--muted);
	}
	.row-note.secret {
		padding: 8px 12px;
		border-radius: 8px;
		background: var(--surface-2);
		color: var(--text);
		font-family: ui-monospace, monospace;
		user-select: all;
	}
	.small-print {
		font-size: 0.82rem;
	}
	@media (max-width: 720px) {
		.table {
			grid-template-columns: 1fr;
		}
		.tr > :nth-child(2),
		.tr > :nth-child(3) {
			display: none;
		}
		.actions {
			grid-column: 1 / -1;
			justify-content: flex-start;
		}
	}
</style>
