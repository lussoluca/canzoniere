<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// marker for e2e tests: only interact after hydration
	$effect(() => {
		document.body.dataset.hydrated = 'true';
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Canzoniere</title>
</svelte:head>

<header class="topbar">
	<a href="/" class="brand">🎸 Canzoniere</a>
	<nav>
		<a href="/">Canzoni</a>
		<a href="/songbooks">Canzonieri</a>
		<a href="/categories">Categorie</a>
		<a href="/help">Guida</a>
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
	.topbar {
		background: #2f3e46;
		padding: 0.6rem 1.2rem;
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
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
	.brand {
		color: #fff;
		text-decoration: none;
		font-weight: 700;
		font-size: 1.1rem;
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
