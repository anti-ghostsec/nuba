<script lang="ts">
	import { enhance } from '$app/forms';
	import Logo from './Logo.svelte';

	let {
		mode,
		next,
		form
	}: { mode: 'login' | 'register'; next: string; form: { username?: string; message?: string } | null } = $props();

	const isLogin = $derived(mode === 'login');
	const other = $derived(`${isLogin ? '/register' : '/login'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`);
	let busy = $state(false);
</script>

<div class="wrap">
	<form
		method="POST"
		class="panel card"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<div class="brand"><Logo /></div>
		<h1>{isLogin ? 'Welcome back' : 'Create an account'}</h1>
		<p class="sub">
			{isLogin ? 'Sign in to see your list.' : 'Just a username and password. No email needed.'}
		</p>

		<input type="hidden" name="next" value={next} />

		<label>
			<span>Username</span>
			<input
				name="username"
				autocomplete="username"
				required
				minlength="3"
				maxlength="24"
				pattern="[A-Za-z0-9_\-]+"
				value={form?.username ?? ''}
			/>
		</label>
		<label>
			<span>Password</span>
			<input
				name="password"
				type="password"
				autocomplete={isLogin ? 'current-password' : 'new-password'}
				required
				minlength={isLogin ? 1 : 8}
			/>
		</label>
		{#if !isLogin}
			<label>
				<span>Confirm password</span>
				<input name="confirm" type="password" autocomplete="new-password" required minlength="8" />
			</label>
			<p class="note">There's no email, so a forgotten password can't be reset. Keep it somewhere safe.</p>
		{/if}

		{#if form?.message}<p class="error" role="alert">{form.message}</p>{/if}

		<button class="btn primary" disabled={busy}>{isLogin ? 'Sign in' : 'Create account'}</button>

		<p class="switch">
			{isLogin ? 'New here?' : 'Already have an account?'}
			<a href={other}>{isLogin ? 'Create an account' : 'Sign in'}</a>
		</p>
	</form>
</div>

<style>
	.wrap {
		display: grid;
		place-items: center;
		padding: 48px var(--gutter);
	}
	.card {
		width: 100%;
		max-width: 400px;
		padding: 32px 28px;
		display: grid;
		gap: 16px;
	}
	.brand {
		justify-self: center;
	}
	h1 {
		font-size: 1.4rem;
		text-align: center;
	}
	.sub {
		margin-top: -10px;
		text-align: center;
		color: var(--muted);
		font-size: 0.92rem;
	}
	label {
		display: grid;
		gap: 6px;
	}
	label span {
		font-size: 0.8rem;
		color: var(--muted);
	}
	input {
		height: 44px;
		padding: 0 12px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface-2);
	}
	input:focus {
		outline: none;
		border-color: var(--accent);
	}
	.note {
		font-size: 0.8rem;
		color: var(--faint);
	}
	.error {
		padding: 10px 12px;
		border-radius: var(--radius);
		background: var(--accent-soft);
		color: var(--text);
		font-size: 0.88rem;
	}
	.btn {
		justify-content: center;
		height: 44px;
	}
	.btn:disabled {
		opacity: 0.7;
	}
	.switch {
		text-align: center;
		font-size: 0.88rem;
		color: var(--muted);
	}
	.switch a {
		color: var(--accent);
	}
</style>
