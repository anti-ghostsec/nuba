<script lang="ts">
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	import Lock from '@lucide/svelte/icons/lock';
	import Avatar from '$lib/components/Avatar.svelte';
	import Card from '$lib/components/Card.svelte';
	import Row from '$lib/components/Row.svelte';
	import { accentInk } from '$lib/prefs';
	import { SITE, STATUSES } from '$lib/site';

	let { data } = $props();

	const p = $derived(data.profile);
	const total = $derived(Object.values(data.counts).reduce((a, b) => a + b, 0));
	const joined = $derived(new Date(p.joinedAt).toLocaleDateString('en', { month: 'short', year: 'numeric' }));
	const groups = $derived(
		STATUSES.map((status) => ({ status, items: data.list.filter((l) => l.entry.status === status) })).filter(
			(g) => g.items.length
		)
	);

	const COLORS: Record<string, string> = {
		CURRENT: '#22d3ee',
		PLANNING: '#818cf8',
		COMPLETED: '#3b82f6',
		PAUSED: '#f59e0b',
		DROPPED: '#f43f5e'
	};
</script>

<svelte:head><title>{p.username} · {SITE.name}</title></svelte:head>

<!-- The owner's profile accent, if they picked one, colors this page for everyone. -->
<div
	class="container page"
	style:--accent={p.accent ?? undefined}
	style:--accent-ink={p.accent ? accentInk(p.accent) : undefined}
>
	<header class="top">
		<Avatar username={p.username} image={p.avatar} size={132} ring />
		<div class="who">
			<h1>{p.username}</h1>
			{#if p.bio}
				<p class="bio">{p.bio}</p>
			{:else if data.own}
				<a class="bio empty" href="/settings#profile">Add a status</a>
			{/if}
			<p class="joined"><CalendarDays size={14} /> Joined {joined}</p>
			{#if data.own}<a class="btn ghost edit" href="/settings#profile">Edit profile</a>{/if}
		</div>
		{#if data.visible}
			<dl class="stats">
				<div><dd>{data.counts.COMPLETED}</dd><dt>Completed</dt></div>
				<div><dd>{data.counts.CURRENT}</dd><dt>{SITE.statuses.CURRENT}</dt></div>
				<div><dd>{data.counts.PLANNING}</dd><dt>Planning</dt></div>
				<div><dd>{data.units.toLocaleString('en')}</dd><dt>{SITE.unit.many}</dt></div>
			</dl>
		{/if}
	</header>

	{#if !data.visible}
		<p class="private"><Lock size={16} /> This profile is private.</p>
	{:else}
		{#if data.own && !p.isPublic}
			<p class="note"><Lock size={14} /> Only you can see your list and favorites. <a href="/settings#profile">Make your profile public</a></p>
		{/if}

		{#if total}
			<section class="block">
				<div class="head">
					<h2>{SITE.listTitle}</h2>
					{#if data.own}<a href="/list">View list →</a>{/if}
				</div>
				<div class="bar" role="img" aria-label="List by status">
					{#each STATUSES as s (s)}
						{#if data.counts[s]}
							<span style:flex={data.counts[s]} style:background={COLORS[s]} title="{SITE.statuses[s]}: {data.counts[s]}">
								{#if data.counts[s] / total > 0.08}{data.counts[s]}{/if}
							</span>
						{/if}
					{/each}
				</div>
				<ul class="legend">
					{#each STATUSES as s (s)}
						{#if data.counts[s]}
							<li><i style:background={COLORS[s]}></i>{SITE.statuses[s]} <b>{data.counts[s]}</b></li>
						{/if}
					{/each}
				</ul>
			</section>
		{/if}

		{#if data.favorites.length}
			<Row title="Favorites" items={data.favorites} />
		{/if}

		{#each groups as g (g.status)}
			<section class="block">
				<h2>{SITE.statuses[g.status]} <span class="count">{g.items.length}</span></h2>
				<div class="grid">
					{#each g.items as l (l.item.id)}<Card item={l.item} />{/each}
				</div>
			</section>
		{:else}
			<p class="muted">Nothing on the list yet.</p>
		{/each}
	{/if}
</div>

<style>
	.page {
		padding-top: 36px;
		display: grid;
		gap: 40px;
	}
	.top {
		display: flex;
		align-items: center;
		gap: 28px;
		padding-bottom: 32px;
		border-bottom: 1px solid var(--border);
		flex-wrap: wrap;
	}
	.who {
		display: grid;
		gap: 6px;
		justify-items: start;
		min-width: 0;
	}
	h1 {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		color: var(--accent);
		overflow-wrap: anywhere;
	}
	.bio {
		color: var(--muted);
	}
	.bio.empty {
		color: var(--faint);
	}
	.bio.empty:hover {
		color: var(--text);
	}
	.joined {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		color: var(--faint);
	}
	.edit {
		margin-top: 6px;
		height: 34px;
		font-size: 0.85rem;
	}
	.stats {
		margin: 0 0 0 auto;
		display: flex;
		gap: 36px;
	}
	.stats div {
		display: grid;
		justify-items: center;
		gap: 2px;
	}
	.stats dd {
		margin: 0;
		order: -1;
		font-size: 1.6rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.stats dt {
		font-size: 0.68rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--faint);
	}
	.private,
	.note {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--muted);
	}
	.note {
		font-size: 0.88rem;
	}
	.note a {
		color: var(--accent);
	}
	.block {
		display: grid;
		gap: 14px;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}
	.head a {
		font-size: 0.85rem;
		color: var(--muted);
	}
	.head a:hover {
		color: var(--text);
	}
	h2 {
		font-size: 1.25rem;
		font-weight: 700;
	}
	.count {
		margin-left: 6px;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--faint);
	}
	.bar {
		display: flex;
		height: 30px;
		border-radius: 8px;
		overflow: hidden;
		gap: 2px;
	}
	.bar span {
		display: grid;
		place-items: center;
		min-width: 6px;
		font-size: 0.78rem;
		font-weight: 600;
		color: #0a0a0c;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px 18px;
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.86rem;
		color: var(--muted);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.legend i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.legend b {
		color: var(--text);
		font-weight: 600;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 24px 16px;
	}
	.muted {
		color: var(--muted);
	}
	@media (max-width: 760px) {
		.stats {
			margin: 0;
			width: 100%;
			justify-content: space-between;
			gap: 12px;
		}
	}
</style>
