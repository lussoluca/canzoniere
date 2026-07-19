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
		/* Only pan gestures: no pinch zoom, no double-tap zoom (font size is
		   controlled in-app). */
		touch-action: pan-x pan-y;
	}

	.app {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}

	header {
		background: #2f3e46;
		/* Side insets keep the brand clear of the Dynamic Island in landscape. */
		padding: calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + 16px)
			10px calc(env(safe-area-inset-left) + 16px);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	/* Landscape on a phone: every vertical pixel counts, the header goes away
	   (navigation stays available through the in-page links). */
	@media (orientation: landscape) and (max-height: 500px) {
		header {
			display: none;
		}
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
		/* Side insets keep the text clear of the Dynamic Island in landscape. */
		padding: 16px calc(env(safe-area-inset-right) + 16px)
			calc(env(safe-area-inset-bottom) + 24px) calc(env(safe-area-inset-left) + 16px);
		box-sizing: border-box;
	}

	:global(a) {
		color: #1d4ed8;
	}
</style>
