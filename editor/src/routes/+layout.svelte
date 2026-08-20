<script lang="ts">
	import { base } from '$app/paths';
	import HeaderMenu from '$lib/components/HeaderMenu.svelte';

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
	<HeaderMenu />
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
	/* Phones: keep the brand on one line next to the burger. */
	@media (max-width: 640px) {
		.brand {
			font-size: 15px;
			white-space: nowrap;
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
