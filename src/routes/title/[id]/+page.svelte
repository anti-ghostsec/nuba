<script lang="ts">
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Heart from '@lucide/svelte/icons/heart';
	import { enhance } from '$app/forms';
	import { useAccount } from '$lib/context';
	import Star from '@lucide/svelte/icons/star';
	import ListEditor from '$lib/components/ListEditor.svelte';
	import { fadeIn } from '$lib/actions';
	import Row from '$lib/components/Row.svelte';
	import { usePrefs } from '$lib/context';
	import { img, score, titleOf } from '$lib/format';
	import { SITE } from '$lib/site';

	let { data } = $props();

	const prefs = usePrefs();
	const account = useAccount();
	let favError = $state<string | null>(null);
	const m = $derived(data.item);
	const title = $derived(titleOf(m, prefs.titleLang));
	// A second name above the title, as on most anime sites: romaji under an
	// English title, English under the others.
	const subtitle = $derived.by(() => {
		const { english, romaji } = m.altTitles;
		const other = prefs.titleLang === 'english' ? romaji : english;
		return other && other !== title ? other : null;
	});
	const search = (key: string | null, value: string) => (key ? `/search?${new URLSearchParams({ [key]: value })}` : null);
	const visibleKeywords = $derived(m.keywords.filter((k) => !k.spoiler));
	const spoilers = $derived(m.keywords.filter((k) => k.spoiler));

	const nextAt = $derived(
		m.next &&
			new Intl.DateTimeFormat('en', {
				timeZone: prefs.tz,
				weekday: 'short',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}).format(new Date(m.next.at * 1000))
	);
</script>

<svelte:head>
	<title>{title} · {SITE.name}</title>
	<meta name="description" content={(m.summary ?? '').slice(0, 160)} />
</svelte:head>

{#snippet chip(label: string, href: string | null, extra?: string)}
	{#if href}
		<a class="chip link" {href}>{label}{#if extra}<span class="weight">{extra}</span>{/if}</a>
	{:else}
		<span class="chip">{label}{#if extra}<span class="weight">{extra}</span>{/if}</span>
	{/if}
{/snippet}

<!-- The cover's color, faintly, until the art arrives; a blurred cover when there's no banner. -->
<div class="banner" style:--ph={m.color ?? 'transparent'}>
	{#if m.banner}
		<img src={img(m.banner)} alt="" fetchpriority="high" use:fadeIn />
	{:else if m.cover}
		<img class="blur" src={img(m.cover)} alt="" use:fadeIn />
	{/if}
</div>

<div class="container detail">
	<div class="cover" style:--ph={m.color ?? 'transparent'}>
		<img src={img(m.coverLarge)} alt="" width="230" height="345" fetchpriority="high" use:fadeIn />
	</div>

	<div class="main">
		<div class="heading">
			{#if subtitle}<p class="alt">{subtitle}</p>{/if}
			<h1>{title}</h1>
		</div>

		<div class="chips">
			{#if m.score}<span class="chip score"><Star size={14} fill="currentColor" />{score(m.score)}</span>{/if}
			{#each m.tags as tag (tag)}{@render chip(tag, search(m.tagFilter, tag))}{/each}
		</div>

		{#if m.next && nextAt}
			<p class="next">{SITE.unit.one} {m.next.unit} arrives {nextAt}</p>
		{/if}

		<p class="desc">{m.summary}</p>

		{#if m.makers}
			<section class="group">
				<h2>{m.makers.label}</h2>
				<div class="chips">
					{#each m.makers.names as name (name)}{@render chip(name, search(m.makers.filter, name))}{/each}
				</div>
			</section>
		{/if}

		{#if m.keywords.length}
			<section class="group">
				<h2>Tags</h2>
				<div class="chips">
					{#each visibleKeywords as k (k.name)}
						{@render chip(k.name, search(m.keywordFilter, k.name), k.weight != null ? `${k.weight}%` : undefined)}
					{/each}
				</div>
				{#if spoilers.length}
					<details class="spoilers">
						<summary>Show {spoilers.length} spoiler {spoilers.length === 1 ? 'tag' : 'tags'}</summary>
						<div class="chips">
							{#each spoilers as k (k.name)}
								{@render chip(k.name, search(m.keywordFilter, k.name), k.weight != null ? `${k.weight}%` : undefined)}
							{/each}
						</div>
					</details>
				{/if}
			</section>
		{/if}

		<section class="watch">
			<h2>{SITE.linksTitle}</h2>
			{#if m.links.length}
				<div class="links">
					{#each m.links as link (link.url)}
						<a class="btn ghost" href={link.url} rel="noreferrer noopener" target="_blank" style:--brand={link.color ?? 'var(--accent)'}>
							<span class="dot"></span>
							{link.label}
							<ExternalLink size={14} />
						</a>
					{/each}
				</div>
			{:else}
				<p class="muted">{SITE.noLinks}</p>
			{/if}
		</section>
	</div>

	<aside class="side">
		<ListEditor itemId={m.id} total={m.total} />
		{#if account.user}
			<form
				method="POST"
				action="/list?/favorite"
				class="fav"
				use:enhance={() =>
					async ({ result, update }) => {
						favError = result.type === 'failure' ? String(result.data?.message ?? 'Could not save.') : null;
						await update({ reset: false, invalidateAll: true });
					}}
			>
				<input type="hidden" name="itemId" value={m.id} />
				<input type="hidden" name="on" value={data.favorite ? '0' : '1'} />
				<input type="hidden" name="redirectTo" value={data.path} />
				<button class="btn ghost" class:on={data.favorite} aria-pressed={data.favorite}>
					<Heart size={16} fill={data.favorite ? 'currentColor' : 'none'} />
					{data.favorite ? 'Favorite' : 'Add to favorites'}
				</button>
				{#if favError}<p class="fav-error" role="alert">{favError}</p>{/if}
			</form>
		{/if}
		<div class="facts panel">
			<dl>
				{#each m.facts as fact (fact.label)}
					<div>
						<dt>{fact.label}</dt>
						<dd>
							{#if fact.filter}<a href={search(fact.filter.key, fact.filter.value)}>{fact.value}</a>{:else}{fact.value}{/if}
						</dd>
					</div>
				{/each}
			</dl>
			{#if m.sourceUrl}
				<a class="source" href={m.sourceUrl} rel="noreferrer" target="_blank">View on {data.sourceName} <ExternalLink size={13} /></a>
			{/if}
		</div>
	</aside>
</div>

{#if m.related.length}
	<div class="container recs">
		<Row title="If you like this" items={m.related} />
	</div>
{/if}

<style>
	.banner {
		position: relative;
		height: clamp(220px, 38vh, 360px);
		background: color-mix(in srgb, var(--ph) 18%, var(--bg));
		overflow: hidden;
	}
	.banner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.banner img.blur {
		filter: blur(28px) brightness(0.6);
		transform: scale(1.2);
	}
	.banner::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, var(--bg), transparent 70%), linear-gradient(to bottom, rgb(0 0 0 / 0.5), transparent 40%);
	}
	.detail {
		position: relative;
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr) 260px;
		gap: 32px;
		margin-top: -110px;
	}
	.cover {
		background: color-mix(in srgb, var(--ph) 22%, var(--surface));
		align-self: start;
		aspect-ratio: 2 / 3;
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow: 0 20px 50px rgb(0 0 0 / 0.5);
	}
	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.main {
		padding-top: 120px;
		display: grid;
		gap: 14px;
		align-content: start;
	}
	h1 {
		font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.4rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.02em;
	}
	.heading {
		display: grid;
		gap: 4px;
	}
	.alt {
		color: var(--muted);
		font-size: 0.95rem;
	}
	.group {
		display: grid;
		gap: 10px;
	}
	.group h2 {
		font-size: 1rem;
		font-weight: 600;
	}
	.spoilers summary {
		width: fit-content;
		margin-bottom: 10px;
		font-size: 0.85rem;
		color: var(--muted);
		cursor: pointer;
	}
	.spoilers summary:hover {
		color: var(--text);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		padding: 4px 10px;
		border-radius: 999px;
		font-size: 0.8rem;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--muted);
	}
	.chip.link {
		transition:
			color 0.15s,
			border-color 0.15s;
	}
	.chip.link:hover {
		color: var(--text);
		border-color: var(--accent);
	}
	.weight {
		margin-left: 2px;
		font-size: 0.72rem;
		color: var(--faint);
	}
	.chip.score {
		color: var(--gold);
		font-weight: 600;
	}
	.next {
		color: var(--accent);
		font-size: 0.92rem;
		font-weight: 500;
	}
	.desc {
		color: var(--muted);
		white-space: pre-line;
		max-width: 72ch;
	}
	.watch {
		display: grid;
		gap: 10px;
		margin-top: 8px;
	}
	.watch h2 {
		font-size: 1.05rem;
		font-weight: 600;
	}
	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}
	.links .btn {
		height: 38px;
		font-size: 0.9rem;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--brand);
	}
	.muted {
		color: var(--muted);
		font-size: 0.9rem;
	}
	.side {
		margin-top: 120px;
		align-self: start;
		display: grid;
		gap: 16px;
	}
	.fav {
		display: grid;
		gap: 6px;
	}
	.fav .btn {
		justify-content: center;
		width: 100%;
	}
	.fav .btn.on {
		color: var(--accent);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
	}
	.fav-error {
		font-size: 0.82rem;
		color: #fb7185;
	}
	.facts {
		padding: 18px;
	}
	dl {
		margin: 0;
		display: grid;
		gap: 12px;
	}
	dt {
		font-size: 0.75rem;
		color: var(--faint);
	}
	dd {
		margin: 0;
		font-size: 0.92rem;
	}
	dd a:hover {
		color: var(--accent);
	}
	.source {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		margin-top: 16px;
		font-size: 0.85rem;
		color: var(--accent);
	}
	.recs {
		margin-top: 48px;
	}
	@media (max-width: 1000px) {
		.detail {
			grid-template-columns: 160px minmax(0, 1fr);
		}
		.side {
			grid-column: 1 / -1;
			margin-top: 0;
		}
	}
	@media (max-width: 640px) {
		.detail {
			grid-template-columns: minmax(0, 1fr);
			margin-top: -80px;
		}
		.cover {
			width: 130px;
		}
		.main {
			padding-top: 0;
		}
	}
</style>
