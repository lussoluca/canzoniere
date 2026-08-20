<script lang="ts">
	import { base } from '$app/paths';
	import { online } from '$lib/online';
	import { pendingCount } from '$lib/pending.svelte';

	let { children } = $props();

	// marker for e2e tests: only interact after hydration
	$effect(() => {
		document.body.dataset.hydrated = 'true';
	});
</script>

<svelte:head>
	<link rel="icon" href="{base}/logo.png" />
	<title>Canzoniere Alessandria 2</title>
</svelte:head>

<header class="topbar">
	<a href="{base}/" class="brand">
		<img class="logo" src="{base}/logo.png" alt="" />
		Canzoniere Alessandria 2
	</a>
	<nav>
		<a href="{base}/">Canzoni</a>
		{#if online}
			<a href="{base}/invia" class="send" data-testid="nav-invia">
				Invia modifiche{#if pendingCount() > 0}&nbsp;<span class="badge">{pendingCount()}</span
					>{/if}
			</a>
		{:else}
			<a href="{base}/songbooks">Canzonieri</a>
			<a href="{base}/categories">Categorie</a>
		{/if}
		<a href="{base}/help">Guida</a>
	</nav>
</header>

<main>
	{@render children()}
</main>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f6f5f2;
		color: #2b2b2b;
	}
	/* Same look as the reader header (reader/src/routes/+layout.svelte). */
	.topbar {
		background: #2f3e46;
		/* Side insets keep the brand clear of the Dynamic Island in landscape. */
		padding: calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + 16px)
			10px calc(env(safe-area-inset-left) + 16px);
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1.4rem;
	}
	.topbar nav {
		display: flex;
		gap: 1rem;
	}
	.topbar nav a {
		color: #cdd7da;
		text-decoration: none;
		font-size: 0.92rem;
	}
	.topbar nav a:hover {
		color: #fff;
	}
	.topbar nav a.send {
		color: #ffd166;
		font-weight: 600;
	}
	.badge {
		display: inline-block;
		min-width: 1.2em;
		text-align: center;
		background: #ffd166;
		color: #2f3e46;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.05rem 0.35rem;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #ffd166;
		text-decoration: none;
		font-weight: 700;
		font-size: 16px;
		min-width: 0;
	}
	.brand .logo {
		width: 28px;
		height: 28px;
		border-radius: 6px;
		flex-shrink: 0;
	}
	/* Phones: the brand and the nav stack instead of overlapping. */
	@media (max-width: 640px) {
		.topbar {
			flex-wrap: wrap;
			gap: 0.4rem 1rem;
		}
		.brand {
			font-size: 15px;
			white-space: nowrap;
		}
		.topbar nav {
			gap: 0.8rem;
			flex-wrap: wrap;
		}
	}
	main {
		max-width: 1100px;
		margin: 0 auto;
		padding: 1.2rem;
	}
	:global(button) {
		font: inherit;
	}
	:global(.btn) {
		display: inline-block;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fff;
		padding: 0.35rem 0.8rem;
		cursor: pointer;
		text-decoration: none;
		color: inherit;
		font-size: 0.9rem;
	}
	:global(.btn:hover) {
		background: #eee;
	}
	:global(.btn.primary) {
		background: #2f3e46;
		border-color: #2f3e46;
		color: #fff;
	}
	:global(.btn.primary:hover) {
		background: #3d5159;
	}
	:global(.btn.danger) {
		color: #b3261e;
		border-color: #d9a5a2;
	}
	:global(.btn.danger:hover) {
		background: #fbeae9;
	}
</style>
