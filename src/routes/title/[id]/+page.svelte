<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Link2 from '@lucide/svelte/icons/link-2';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
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

	let { data, form } = $props();

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
	const c = $derived(data.community);
	const isAdmin = $derived(!!account.user?.isAdmin);
	/** A search for everything linked with this tag by this kind of link. */
	const linkSearch = (tag: string, kind: string) => `/search?${new URLSearchParams({ q: `${tag} ${kind}` })}`;

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

		<section class="group community" id="community">
			<h2>Community tags</h2>
			{#if c.tags.length}
				<div class="chips">
					{#each c.tags as t (t.name)}
						<span class="ctag" class:faded={t.score <= 0}>
							<a href={search('community', t.name)}>{t.name}</a>
							<span class="weight" title="Score">{t.score}</span>
							{#if c.canTag}
								<form method="POST" action="?/tag#community" class="votes" use:enhance>
									<input type="hidden" name="name" value={t.name} />
									<button name="vote" value={t.mine === 1 ? '0' : '1'} class:on={t.mine === 1} aria-pressed={t.mine === 1} title="Fits">
										<ChevronUp size={14} /><span class="sr-only">Fits</span>
									</button>
									<button name="vote" value={t.mine === -1 ? '0' : '-1'} class:on={t.mine === -1} aria-pressed={t.mine === -1} title="Doesn't fit">
										<ChevronDown size={14} /><span class="sr-only">Doesn't fit</span>
									</button>
								</form>
							{/if}
							{#if isAdmin}
								<form method="POST" action="?/removeTag#community" class="votes" use:enhance>
									<input type="hidden" name="name" value={t.name} />
									<button class="remove" title="Remove from this title"><X size={13} /><span class="sr-only">Remove</span></button>
								</form>
							{/if}
						</span>
					{/each}
				</div>
			{:else}
				<p class="muted">No community tags yet.</p>
			{/if}

			{#if c.links.length}
				<ul class="clinks">
					{#each c.links as l (l.id)}
						<li class:faded={l.score <= 0}>
							<a class="kind" href="/search?{new URLSearchParams({ q: l.kind })}"><Link2 size={13} />{l.kind}</a>
							<span class="members">
								{#each l.members as name, i (i)}{#if i}<span class="sep">·</span>{/if}<a href={linkSearch(name, l.kind)}>{name}</a>{/each}
							</span>
							<span class="weight" title="Score">{l.score}</span>
							{#if c.canTag}
								<form method="POST" action="?/linkVote#community" class="votes" use:enhance>
									<input type="hidden" name="linkId" value={l.id} />
									<button name="vote" value={l.mine === 1 ? '0' : '1'} class:on={l.mine === 1} aria-pressed={l.mine === 1} title="Fits">
										<ChevronUp size={14} /><span class="sr-only">Fits</span>
									</button>
									<button name="vote" value={l.mine === -1 ? '0' : '-1'} class:on={l.mine === -1} aria-pressed={l.mine === -1} title="Doesn't fit">
										<ChevronDown size={14} /><span class="sr-only">Doesn't fit</span>
									</button>
								</form>
							{/if}
							{#if isAdmin}
								<form method="POST" action="?/removeLink#community" class="votes" use:enhance>
									<input type="hidden" name="linkId" value={l.id} />
									<button class="remove" title="Remove this link"><X size={13} /><span class="sr-only">Remove</span></button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			{#if form?.community}<p class="form-error" role="alert">{form.community}</p>{/if}

			{#if c.canTag}
				<div class="editors">
					<form method="POST" action="?/tag#community" class="add" use:enhance>
						<input type="hidden" name="vote" value="1" />
						<input
							name="name"
							list="tag-suggestions"
							maxlength="40"
							required
							autocomplete="off"
							placeholder="Add a tag, e.g. found family or character:rem"
							aria-label="New tag"
							value={form?.name ?? ''}
						/>
						{#if account.user?.showAdult}
							<label class="check"><input type="checkbox" name="adult" value="1" /> 18+</label>
						{/if}
						<button class="btn ghost small"><Plus size={15} /> Tag</button>
					</form>
					<datalist id="tag-suggestions">
						{#each c.suggestions as name (name)}<option value={name}></option>{/each}
					</datalist>

					{#if c.linkNames.length}
						<form method="POST" action="?/link#community" class="add" use:enhance>
							<select name="kind" aria-label="Kind of link">
								{#each c.linkNames as k (k)}<option value={k}>{k}</option>{/each}
							</select>
							<input
								name="members"
								required
								autocomplete="off"
								placeholder="Tags to link, in order: rabbit, eat, carrot"
								aria-label="Tags to link, separated by commas"
								value={form?.members ?? ''}
							/>
							<button class="btn ghost small"><Link2 size={15} /> Link</button>
						</form>
						{#if c.linkable.length}
							<details class="linkable">
								<summary>Tags on this title you can link</summary>
								<p>{c.linkable.join(', ')}</p>
							</details>
						{/if}
					{/if}
				</div>
			{:else if c.blocked}
				<p class="muted">Tagging is turned off for your account.</p>
			{:else if !account.user}
				<p class="muted"><a href="/login?next={encodeURIComponent(data.path)}">Sign in</a> to add tags and link them.</p>
			{/if}
		</section>

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
	.ctag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 2px 4px 2px 10px;
		border-radius: 999px;
		font-size: 0.8rem;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--muted);
	}
	.ctag > a:hover,
	.clinks a:hover {
		color: var(--accent);
	}
	.ctag:not(:has(form)) {
		padding-right: 10px;
	}
	.faded {
		opacity: 0.55;
	}
	.votes {
		display: inline-flex;
	}
	.votes button {
		display: inline-grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--faint);
		cursor: pointer;
	}
	.votes button:hover {
		color: var(--text);
		background: var(--surface-2);
	}
	.votes button.on {
		color: var(--accent);
	}
	.votes .remove:hover {
		color: #fb7185;
	}
	.clinks {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 6px;
	}
	.clinks li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		font-size: 0.85rem;
	}
	.kind {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 1px 8px;
		border-radius: 6px;
		background: var(--accent-soft);
		color: var(--accent);
		font-size: 0.75rem;
		font-weight: 600;
	}
	.members {
		color: var(--text);
	}
	.sep {
		margin: 0 5px;
		color: var(--faint);
	}
	.editors {
		display: grid;
		gap: 8px;
	}
	.add {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.add input:not([type]),
	.add select {
		height: 34px;
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-size: 0.85rem;
	}
	.add input:not([type]) {
		flex: 1;
		min-width: 200px;
	}
	.add input:focus,
	.add select:focus {
		border-color: var(--accent);
		outline: 0;
	}
	.add .btn.small {
		height: 34px;
		padding: 0 12px;
		font-size: 0.82rem;
	}
	.check {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.linkable summary {
		width: fit-content;
		font-size: 0.8rem;
		color: var(--muted);
		cursor: pointer;
	}
	.linkable p {
		margin-top: 6px;
		font-size: 0.8rem;
		color: var(--muted);
	}
	.form-error {
		font-size: 0.85rem;
		color: #fb7185;
	}
	.muted a {
		color: var(--accent);
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
