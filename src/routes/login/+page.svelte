<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import { SITE } from '$lib/site';

	let { data, form } = $props();
</script>

<svelte:head><title>Sign in · {SITE.name}</title></svelte:head>

<AuthForm mode="login" next={data.next} {form} />
