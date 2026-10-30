<script lang="ts">
	import Check from '@lucide/svelte/icons/check';
	import Pipette from '@lucide/svelte/icons/pipette';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import Avatar from '$lib/components/Avatar.svelte';
	import { img, titleOf } from '$lib/format';
	import type { Snippet } from 'svelte';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { useAccount, usePrefs } from '$lib/context';
	import { ACCENTS } from '$lib/prefs';
	import { SITE } from '$lib/site';

	let { data, form } = $props();

	const prefs = usePrefs();
	const account = useAccount();
	const isPreset = $derived(ACCENTS.some((a) => a.value === prefs.accent));

	let find = $state('');
	const needle = $derived(find.trim().toLowerCase());
	const shown = (...text: string[]) => !needle || text.join(' ').toLowerCase().includes(needle);

	// With JavaScript, device settings apply as you change them. Without it,
	// they belong to the "prefs" form and an Apply button saves them.
	let enhanced = $state(false);
	onMount(() => (enhanced = true));

	const sections = $derived([
		{ id: 'account', label: 'Account' },
		...(account.user ? [{ id: 'profile', label: 'Profile' }] : []),
		{ id: 'appearance', label: 'Appearance' },
		{ id: 'content', label: 'Content' },
		...(account.user ? [{ id: 'data', label: 'Your data' }] : [])
	]);

	const note = (section: string) => (form?.section === section ? form : null);

	// Picker forms save as soon as something is picked (with JavaScript).
	const autosave = (e: Event) => (e.currentTarget as HTMLFormElement).requestSubmit();
	let bio = $state('');
	$effect(() => {
		bio = data.profile?.bio ?? '';
	});
	const profileAccentPreset = $derived(!data.profile?.accent || ACCENTS.some((a) => a.value === data.profile?.accent));
</script>

<svelte:head><title>Settings · {SITE.name}</title></svelte:head>

{#snippet row(title: string, desc: string, device: boolean, control: Snippet, id = '')}
	<div class="row" {id} hidden={!shown(title, desc)}>
		<div class="text">
			<h3>{title}{#if device}<span class="badge">This device</span>{/if}</h3>
			<p>{desc}</p>
		</div>
		<div class="control">{@render control()}</div>
	</div>
{/snippet}

{#snippet message(section: string)}
	{@const n = note(section)}
	{#if n}<p class="msg" class:ok={n.ok} role="status">{n.message}</p>{/if}
{/snippet}

{#snippet toggle(name: string, value: boolean, set: (v: boolean) => void)}
	<div class="seg">
		{#each [false, true] as v (v)}
			<label>
				<input type="radio" {name} value={String(v)} checked={value === v} onchange={() => set(v)} form="prefs" />
				<span>{v ? 'On' : 'Off'}</span>
			</label>
		{/each}
	</div>
{/snippet}

{#snippet choice(name: string, options: [string, string][], value: string, set: (v: string) => void)}
	<div class="seg">
		{#each options as [v, label] (v)}
			<label>
				<input type="radio" {name} value={v} checked={value === v} onchange={() => set(v)} form="prefs" />
				<span>{label}</span>
			</label>
		{/each}
	</div>
{/snippet}

<!-- Device settings submit through this form when JavaScript is off. -->
<form id="prefs" method="POST" action="?/prefs" onsubmit={(e) => enhanced && e.preventDefault()}>
	<input type="hidden" name="redirectTo" value={page.url.pathname} />
</form>

<div class="container layout">
	<aside class="nav">
		<h1>Settings</h1>
		{#if enhanced}
			<label class="find">
				<Search size={16} />
				<input type="search" placeholder="Search settings" bind:value={find} aria-label="Search settings" />
			</label>
		{/if}
		<nav>
			{#each sections as s (s.id)}<a href="#{s.id}">{s.label}</a>{/each}
			{#if account.user?.isAdmin}<a href="/admin" class="admin">Admin</a>{/if}
		</nav>
	</aside>

	<div class="sections">
		<section class="panel" id="account">
			<h2>Account</h2>
			{#if account.user}
				{#snippet username()}
					<form method="POST" action="?/username" class="inline" use:enhance>
						<input name="username" value={account.user?.username} autocomplete="username" maxlength="24" required />
						<button class="btn ghost">Save</button>
					</form>
					{@render message('username')}
				{/snippet}
				{@render row('Username', 'Shown on your list. 3–24 characters: letters, numbers, _ or -.', false, username)}

				{#snippet password()}
					<form method="POST" action="?/password" class="stack" use:enhance>
						<input name="current" type="password" placeholder="Current password" autocomplete="current-password" required />
						<input name="next" type="password" placeholder="New password" autocomplete="new-password" minlength="8" required />
						<input name="repeat" type="password" placeholder="Repeat new password" autocomplete="new-password" required />
						<button class="btn ghost">Change</button>
					</form>
					{@render message('password')}
				{/snippet}
				{@render row(
					'Password',
					'At least 8 characters. Changing it signs you out on every other device. There is no email, so keep it somewhere safe.',
					false,
					password
				)}

				{#snippet sessions()}
					<form method="POST" action="?/signOutOthers" use:enhance>
						<button class="btn ghost">Sign out others</button>
					</form>
					{@render message('sessions')}
				{/snippet}
				{@render row('Other devices', 'Sign out everywhere except here, if you used a shared computer.', false, sessions)}
			{:else}
				<p class="hint"><a href="/login?next=/settings">Sign in</a> to change your username, password and account settings.</p>
			{/if}
		</section>

		{#if account.user && data.profile}
			{@const profile = data.profile}
			<section class="panel" id="profile">
				<h2>Profile</h2>

				{#if data.hasAvatars}
					{#snippet avatar()}
						<div class="avatar-pick">
							<Avatar username={account.user?.username ?? ''} image={profile.avatar} size={84} ring />
							<form class="mini-search" data-sveltekit-noscroll data-sveltekit-keepfocus action="#profile">
								<input type="hidden" name="fav" value={data.favSearch} />
								<Search size={14} />
								<input name="avatars" type="search" value={data.avatarSearch} placeholder="Search characters…" aria-label="Search characters" />
							</form>
							<form method="POST" action="?/avatar" class="choices" use:enhance onchange={autosave}>
								<label class="choice letter" title="First letter">
									<input type="radio" name="avatar" value="" checked={!profile.avatar} />
									<span>{account.user?.username.charAt(0).toUpperCase()}</span>
								</label>
								{#each data.avatars as a (a.id)}
									<label class="choice" title={a.label}>
										<input type="radio" name="avatar" value={a.image} checked={profile.avatar === a.image} />
										<img src={img(a.image)} alt={a.label} loading="lazy" width="48" height="48" />
									</label>
								{:else}
									<p class="hint small">No characters found.</p>
								{/each}
								{#if !enhanced}<button class="btn ghost">Save</button>{/if}
							</form>
							{@render message('avatar')}
						</div>
					{/snippet}
					{@render row('Avatar', 'Pick a character, or keep your first letter. Shown on your profile and in the menu.', false, avatar)}
				{/if}

				{#snippet status()}
					<form method="POST" action="?/bio" class="inline" use:enhance>
						<input name="bio" bind:value={bio} maxlength={data.bioMax} placeholder="Rewatching Frieren for the third time" />
						<span class="counter">{bio.length}/{data.bioMax}</span>
						<button class="btn ghost">Save</button>
					</form>
					{@render message('bio')}
				{/snippet}
				{@render row('Status', `One line under your name on your profile, up to ${data.bioMax} characters.`, false, status)}

				{#snippet paccent()}
					<form method="POST" action="?/profileAccent" class="swatches" use:enhance onchange={autosave}>
						<label class="swatch site" style:--c="var(--accent)" title="Same as the site">
							<input type="radio" name="profileAccent" value="" checked={!profile.accent} />
							<span><Check size={14} strokeWidth={3} /></span>
							<span class="sr-only">Same as the site</span>
						</label>
						{#each ACCENTS as a (a.value)}
							<label class="swatch" style:--c={a.value} title={a.name}>
								<input type="radio" name="profileAccent" value={a.value} checked={profile.accent === a.value} />
								<span><Check size={14} strokeWidth={3} /></span>
								<span class="sr-only">{a.name}</span>
							</label>
						{/each}
						<label class="swatch custom" style:--c={profileAccentPreset ? 'transparent' : profile.accent} title="Custom color">
							<input type="radio" name="profileAccent" value="custom" checked={!profileAccentPreset} tabindex="-1" />
							<span><Pipette size={14} /></span>
							<input type="color" name="profileAccentCustom" aria-label="Custom profile color" value={profile.accent ?? '#ff3d68'} />
						</label>
						{#if !enhanced}<button class="btn ghost">Save</button>{/if}
					</form>
					{@render message('profileAccent')}
				{/snippet}
				{@render row('Profile accent', 'Your avatar ring, name and highlights on your profile. Visitors see it too.', false, paccent)}

				{#snippet favs()}
					<div class="favs">
						{#each data.favorites as f (f.id)}
							<div class="fav">
								<img src={img(f.cover)} alt="" width="34" height="48" />
								<a href="/title/{f.id}">{titleOf(f, prefs.titleLang)}</a>
								<form method="POST" action="/list?/favorite" use:enhance>
									<input type="hidden" name="itemId" value={f.id} />
									<input type="hidden" name="on" value="0" />
									<input type="hidden" name="redirectTo" value="/settings#profile" />
									<button class="icon-btn small" aria-label="Remove {f.title}"><X size={14} /></button>
								</form>
							</div>
						{/each}
						<p class="small hint">{data.favorites.length} / {data.favoritesMax}</p>
						{#if data.favorites.length < data.favoritesMax}
							<form class="mini-search wide" data-sveltekit-noscroll data-sveltekit-keepfocus action="#profile">
								<input type="hidden" name="avatars" value={data.avatarSearch} />
								<Search size={14} />
								<input name="fav" type="search" value={data.favSearch} placeholder="Search a title to add…" aria-label="Search a title to add" />
							</form>
							{#each data.favResults.filter((r) => !data.favorites.some((f) => f.id === r.id)) as r (r.id)}
								<form method="POST" action="/list?/favorite" class="fav result" use:enhance>
									<img src={img(r.cover)} alt="" width="34" height="48" />
									<span>{titleOf(r, prefs.titleLang)}</span>
									<input type="hidden" name="itemId" value={r.id} />
									<input type="hidden" name="on" value="1" />
									<input type="hidden" name="redirectTo" value="/settings#profile" />
									<button class="btn ghost small">Add</button>
								</form>
							{/each}
						{/if}
					</div>
				{/snippet}
				{@render row(
					'Favorites',
					`Up to ${data.favoritesMax} titles, newest first, shown on your profile. You can also add them from a title's page.`,
					false,
					favs
				)}

				{#snippet visibility()}
					<form method="POST" action="?/public" class="seg" use:enhance>
						<button name="public" value="0" aria-pressed={!profile.isPublic}>Private</button>
						<button name="public" value="1" aria-pressed={profile.isPublic}>Public</button>
					</form>
					{@render message('public')}
				{/snippet}
				{@render row(
					'Who sees your list',
					'Private: your list, stats and favorites are only for you. Public: anyone with the link to your profile can see them. Your name, avatar and status are always visible.',
					false,
					visibility
				)}

				{#snippet view()}
					<a class="btn ghost" href="/u/{account.user?.username}">View profile</a>
				{/snippet}
				{@render row('Your profile', 'See your page the way it shows.', false, view)}
			</section>
		{/if}

		<section class="panel" id="appearance">
			<h2>Appearance</h2>

			{#snippet mode()}
				{@render choice('mode', [['dark', 'Dark'], ['light', 'Light']], prefs.mode, (v) => (prefs.mode = v as 'dark' | 'light'))}
			{/snippet}
			{@render row('Mode', 'Dark or light. Your accent carries over to both.', true, mode)}

			{#snippet accent()}
				<div class="swatches">
					{#each ACCENTS as a (a.value)}
						<label class="swatch" style:--c={a.value} title={a.name}>
							<input type="radio" name="accent" value={a.value} checked={prefs.accent === a.value} onchange={() => (prefs.accent = a.value)} form="prefs" />
							<span><Check size={14} strokeWidth={3} /></span>
							<span class="sr-only">{a.name}</span>
						</label>
					{/each}
					<label class="swatch custom" style:--c={isPreset ? 'transparent' : prefs.accent} title="Custom color">
						<input type="radio" name="accent" value="custom" checked={!isPreset} tabindex="-1" form="prefs" />
						<span><Pipette size={14} /></span>
						<input type="color" name="accentCustom" aria-label="Custom accent color" value={prefs.accent} oninput={(e) => (prefs.accent = e.currentTarget.value)} form="prefs" />
					</label>
				</div>
			{/snippet}
			{@render row('Accent', 'Buttons, links and highlights. Text on the accent switches between light and dark to stay readable.', true, accent)}

			{#snippet textSize()}
				{@render choice(
					'textSize',
					[['small', 'Small'], ['medium', 'Medium'], ['large', 'Large']],
					prefs.textSize,
					(v) => (prefs.textSize = v as 'small' | 'medium' | 'large')
				)}
			{/snippet}
			{@render row('Text size', 'Scales text across the site. Medium is the default.', true, textSize)}

			{#snippet motion()}
				{@render toggle('reduceMotion', prefs.reduceMotion, (v) => (prefs.reduceMotion = v))}
			{/snippet}
			{@render row(
				'Reduce motion',
				"Cuts down animations: the home carousel, hover zoom, page fades. Your device's own setting is always respected too.",
				true,
				motion
			)}

			{#if !enhanced}<div class="apply"><button class="btn primary" form="prefs">Apply</button></div>{/if}
		</section>

		<section class="panel" id="content">
			<h2>Content</h2>

			{#if SITE.titleLanguages}
				{#snippet lang()}
					{@render choice(
						'titleLang',
						[['english', 'English'], ['romaji', 'Romaji'], ['native', 'Native']],
						prefs.titleLang,
						(v) => (prefs.titleLang = v as 'english' | 'romaji' | 'native')
					)}
				{/snippet}
				{@render row('Title language', 'Which name titles are shown by, where there is one.', true, lang)}
			{/if}

			{#snippet adult()}
				{#if account.user}
					<form method="POST" action="?/content" use:enhance class="seg">
						<button name="showAdult" value="0" aria-pressed={!account.user.showAdult}>Off</button>
						<button name="showAdult" value="1" aria-pressed={account.user.showAdult}>On</button>
					</form>
				{:else}
					<a class="btn ghost" href="/login?next=/settings">Sign in</a>
				{/if}
			{/snippet}
			{@render row(
				'Show adult titles',
				'I am 18 or older. Includes adult titles in search and browsing. Off by default, and always off for anyone not signed in. This is a self-declaration, not age verification.',
				false,
				adult
			)}

			{#snippet sort()}
				<select name="sort" form="prefs" value={prefs.sort} onchange={(e) => (prefs.sort = e.currentTarget.value)}>
					<option value="">Default</option>
					{#each data.sorts as o (o.value)}<option value={o.value}>{o.label}</option>{/each}
				</select>
			{/snippet}
			{@render row('Default browse order', 'How Browse orders titles when you have not picked a sort or typed a search.', true, sort)}

			{#snippet cont()}
				{@render toggle('showContinue', prefs.showContinue, (v) => (prefs.showContinue = v))}
			{/snippet}
			{@render row(`${SITE.continueTitle} on home`, 'The row of what you are watching at the top of the home page.', true, cont)}

			{#if !enhanced}<div class="apply"><button class="btn primary" form="prefs">Apply</button></div>{/if}
		</section>

		{#if account.user}
			<section class="panel" id="data">
				<h2>Your data</h2>

				{#snippet exportList()}
					<a class="btn ghost" href="/settings/export" download>Download (.json)</a>
				{/snippet}
				{@render row('Export your list', 'Everything on your list: status and progress, with titles, as a JSON file.', false, exportList)}

				{#snippet clear()}
					<form method="POST" action="?/clearList" class="stack" use:enhance>
						<label class="confirm"><input type="checkbox" name="confirm" value="yes" required /> Yes, remove everything</label>
						<button class="btn ghost">Clear list</button>
					</form>
					{@render message('clear')}
				{/snippet}
				{@render row('Clear your list', 'Removes every title from your list and Continue Watching. Cannot be undone.', false, clear)}

				{#snippet remove()}
					<form method="POST" action="?/deleteAccount" class="stack" use:enhance>
						<input name="password" type="password" placeholder="Your password" autocomplete="current-password" required />
						<button class="btn danger">Delete account</button>
					</form>
					{@render message('delete')}
				{/snippet}
				{@render row(
					'Delete account',
					'Permanently deletes your account and list. The username becomes free for anyone to take.',
					false,
					remove,
					'delete'
				)}
			</section>
		{/if}
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: 240px minmax(0, 1fr);
		gap: 28px;
		padding-top: 28px;
		align-items: start;
	}
	.nav {
		position: sticky;
		top: calc(var(--header-h) + 16px);
		display: grid;
		gap: 14px;
	}
	h1 {
		font-size: 1.6rem;
		font-weight: 700;
	}
	.find {
		display: flex;
		align-items: center;
		gap: 9px;
		height: 40px;
		padding: 0 12px;
		border-radius: var(--radius);
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
	nav {
		display: grid;
		gap: 2px;
	}
	nav a {
		padding: 9px 12px;
		border-radius: 8px;
		color: var(--muted);
		border-left: 2px solid transparent;
		transition:
			background 0.15s,
			color 0.15s;
	}
	nav a:hover {
		background: var(--surface);
		color: var(--text);
	}
	nav a.admin {
		margin-top: 8px;
		color: var(--accent);
	}

	.sections {
		display: grid;
		gap: 20px;
	}
	.panel {
		padding: 8px 24px;
		scroll-margin-top: calc(var(--header-h) + 16px);
	}
	/* Hide a whole section when the settings search matches none of its rows. */
	.panel:has(.row):not(:has(.row:not([hidden]))) {
		display: none;
	}
	h2 {
		padding: 16px 0 4px;
		font-size: 1.1rem;
		font-weight: 600;
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 24px;
		padding: 18px 0;
		border-top: 1px solid var(--border);
		scroll-margin-top: calc(var(--header-h) + 16px);
	}
	h2 + .row {
		border-top: 0;
	}
	.row[hidden] {
		display: none;
	}
	.text {
		max-width: 52ch;
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.95rem;
		font-weight: 500;
	}
	.badge {
		padding: 1px 6px;
		border-radius: 5px;
		border: 1px solid var(--border);
		font-size: 0.62rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--faint);
	}
	.text p {
		margin-top: 4px;
		font-size: 0.86rem;
		color: var(--muted);
	}
	.control {
		display: grid;
		justify-items: end;
		gap: 8px;
		flex-shrink: 0;
	}
	.hint {
		padding: 8px 0 20px;
		color: var(--muted);
	}
	.hint a {
		color: var(--accent);
	}

	input:not([type='radio']):not([type='checkbox']):not([type='color']):not([type='search']),
	select {
		height: 38px;
		width: 240px;
		padding: 0 12px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
	}
	input:focus,
	select:focus {
		outline: 0;
		border-color: var(--accent);
	}
	.inline {
		display: flex;
		gap: 8px;
	}
	.stack {
		display: grid;
		justify-items: end;
		gap: 8px;
	}
	.btn {
		height: 38px;
	}
	.btn.danger {
		background: #e11d48;
		border-color: #e11d48;
		color: #fff;
	}
	.btn.danger:hover {
		background: #be123c;
	}
	.confirm {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.86rem;
		color: var(--muted);
	}
	.confirm input {
		accent-color: var(--accent);
	}
	.msg {
		font-size: 0.82rem;
		color: #fb7185;
		max-width: 240px;
		text-align: right;
	}
	.msg.ok {
		color: var(--muted);
	}
	.apply {
		padding: 0 0 18px;
		display: flex;
		justify-content: flex-end;
	}

	.seg {
		display: flex;
		gap: 6px;
	}
	.seg label {
		position: relative;
	}
	.seg input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.seg span,
	.seg button {
		display: inline-grid;
		place-items: center;
		height: 34px;
		padding: 0 14px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
		font-size: 0.88rem;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			border-color 0.15s;
	}
	.seg input:checked + span,
	.seg button[aria-pressed='true'] {
		background: var(--accent-soft);
		border-color: var(--accent);
		color: var(--text);
	}
	.seg input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.swatches {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 9px;
		max-width: 260px;
	}
	.swatch {
		position: relative;
		cursor: pointer;
	}
	.swatch input[type='radio'] {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.swatch > span:first-of-type {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
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
	.swatch input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}
	.custom > span:first-of-type {
		border: 1px dashed var(--faint);
		color: var(--muted);
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

	.avatar-pick {
		display: grid;
		justify-items: end;
		gap: 10px;
		width: 340px;
	}
	.mini-search {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		height: 36px;
		padding: 0 10px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--muted);
	}
	.mini-search:focus-within {
		border-color: var(--accent);
	}
	.mini-search input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: 0;
		background: none;
		color: var(--text);
	}
	.choices {
		display: grid;
		grid-template-columns: repeat(auto-fill, 48px);
		gap: 6px;
		width: 100%;
		max-height: 220px;
		overflow-y: auto;
		padding: 6px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
	}
	.choice {
		position: relative;
		cursor: pointer;
	}
	.choice input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.choice img,
	.choice span {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 10px;
		object-fit: cover;
		border: 2px solid transparent;
	}
	.choice.letter span {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 700;
	}
	.choice input:checked + img,
	.choice input:checked + span {
		border-color: var(--accent);
	}
	.choice input:focus-visible + img,
	.choice input:focus-visible + span {
		outline: 2px solid var(--accent);
		outline-offset: 1px;
	}
	.counter {
		align-self: center;
		font-size: 0.78rem;
		color: var(--faint);
	}
	.swatch.site > span:first-of-type {
		background: conic-gradient(var(--accent) 0 50%, var(--surface-2) 0);
	}
	.favs {
		display: grid;
		gap: 6px;
		width: 340px;
	}
	.fav {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 4px 6px 4px 4px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--surface);
		font-size: 0.86rem;
	}
	.fav img {
		width: 34px;
		height: 48px;
		border-radius: 5px;
		object-fit: cover;
		background: var(--surface-2);
	}
	.fav a,
	.fav span {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.fav.result {
		border-style: dashed;
	}
	.small {
		font-size: 0.8rem;
	}
	.icon-btn.small {
		width: 28px;
		height: 28px;
	}
	.btn.small {
		height: 30px;
		padding: 0 10px;
		font-size: 0.8rem;
	}

	@media (max-width: 860px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.nav {
			position: static;
		}
		nav {
			display: flex;
			flex-wrap: wrap;
		}
	}
	@media (max-width: 640px) {
		.row {
			flex-direction: column;
		}
		.control,
		.stack {
			justify-items: start;
		}
		.swatches {
			justify-content: flex-start;
		}
		.avatar-pick,
		.favs {
			width: 100%;
			justify-items: start;
		}
		input:not([type='radio']):not([type='checkbox']):not([type='color']):not([type='search']),
		select {
			width: 100%;
		}
		.msg {
			text-align: left;
		}
	}
</style>
