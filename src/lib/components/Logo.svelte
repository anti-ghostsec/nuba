<script lang="ts">
	import { SITE } from '$lib/site';
</script>

<!-- Lacquer-black disc with an accent shine: "nubatama", the poetic black. -->
<span class="logo">
	<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
		<defs>
			<radialGradient id="nuba-shine" cx="0.32" cy="0.28" r="0.75">
				<stop offset="0" stop-color="var(--accent)" stop-opacity="0.95" />
				<stop offset="0.35" stop-color="var(--accent)" stop-opacity="0.25" />
				<stop offset="1" stop-color="#000" stop-opacity="0" />
			</radialGradient>
		</defs>
		<circle cx="16" cy="16" r="15" fill="#050506" />
		<circle cx="16" cy="16" r="15" fill="url(#nuba-shine)" />
		<circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--accent)" stroke-opacity="0.55" />
	</svg>
	<span class="word">{SITE.name.toLowerCase()}</span>
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 9px;
	}
	.word {
		font-size: 1.45rem;
		font-weight: 800;
		letter-spacing: -0.04em;
		background: linear-gradient(100deg, var(--text) 30%, var(--accent));
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
</style>
