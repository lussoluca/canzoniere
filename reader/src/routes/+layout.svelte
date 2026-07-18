<script lang="ts">
	import { base } from '$app/paths';

	let { children } = $props();
</script>

<div class="app">
	<header>
		<a class="brand" href="{base}/">📖 Canzoniere</a>
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		background: #f6f4ee;
		color: #1f2937;
		font-family:
			-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
		-webkit-text-size-adjust: 100%;
	}

	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	header {
		background: #2f3e46;
		padding: calc(env(safe-area-inset-top) + 10px) 16px 10px;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.brand {
		color: #ffd166;
		font-weight: 700;
		font-size: 17px;
		text-decoration: none;
	}

	main {
		flex: 1;
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		padding: 16px 16px calc(env(safe-area-inset-bottom) + 24px);
		box-sizing: border-box;
	}

	:global(a) {
		color: #1d4ed8;
	}
</style>
