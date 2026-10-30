<script lang="ts">
	import AuthForm from '$lib/components/AuthForm.svelte';
	import { SITE } from '$lib/site';

	let { data, form } = $props();
</script>

<svelte:head><title>Create account · {SITE.name}</title></svelte:head>

<AuthForm mode="register" next={data.next} {form} />
