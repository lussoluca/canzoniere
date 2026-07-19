<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadTheme, saveTheme, applyTheme, type Theme } from '$lib/theme';

	let { children } = $props();

	// Explicit choice from the toggle; null means "follow the system".
	let chosen = $state<Theme | null>(null);
	let system = $state<Theme>('light');
	let mounted = $state(false);

	const effective = $derived(chosen ?? system);

	onMount(() => {
		chosen = loadTheme();
		const mq = matchMedia('(prefers-color-scheme: dark)');
		system = mq.matches ? 'dark' : 'light';
		const onChange = (e: MediaQueryListEvent) => {
			system = e.matches ? 'dark' : 'light';
		};
		mq.addEventListener('change', onChange);
		mounted = true;
		return () => mq.removeEventListener('change', onChange);
	});

	function toggleTheme() {
		chosen = effective === 'dark' ? 'light' : 'dark';
		saveTheme(chosen);
		applyTheme(chosen);
	}
</script>

<div class="app">
	<header>
		<a class="brand" href="{base}/">📖 Canzoniere</a>
		{#if mounted}
			<button
				class="theme"
				onclick={toggleTheme}
				aria-label={effective === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
			>
				{effective === 'dark' ? '☀️' : '🌙'}
			</button>
		{/if}
	</header>

	<main>
		{@render children()}
	</main>
</div>

<style>
	/* Light theme (default). */
	:global(:root) {
		--bg: #f6f4ee;
		--text: #1f2937;
		--muted: #6b7280;
		--faint: #9ca3af;
		--border: #e5e7eb;
		--control-border: #d1d5db;
		--surface: #ffffff;
		--header-bg: #2f3e46;
		--brand: #ffd166;
		--link: #1d4ed8;
		--chord: #a15c07;
		--chorus: #d9c58a;
		--danger: #b91c1c;
		--active-bg: #2f3e46;
		--active-text: #ffd166;
		--shadow: rgba(0, 0, 0, 0.12);
		--diagram-ink: #1f2937;
		--diagram-surface: #ffffff;
		--diagram-muted: #999999;
	}

	/* Dark theme: applied by the system preference (unless light is forced)
	   or by the explicit toggle. Keep both blocks in sync. */
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) {
			--bg: #16181a;
			--text: #e5e3dc;
			--muted: #a1a6ad;
			--faint: #7d838b;
			--border: #33373c;
			--control-border: #494f56;
			--surface: #23262a;
			--header-bg: #2f3e46;
			--brand: #ffd166;
			--link: #94b8f8;
			--chord: #e3a95c;
			--chorus: #8a7a45;
			--danger: #f08a8a;
			--active-bg: #ffd166;
			--active-text: #23262a;
			--shadow: rgba(0, 0, 0, 0.5);
			--diagram-ink: #e5e3dc;
			--diagram-surface: #23262a;
			--diagram-muted: #7d838b;
		}
	}

	:global(:root[data-theme='dark']) {
		--bg: #16181a;
		--text: #e5e3dc;
		--muted: #a1a6ad;
		--faint: #7d838b;
		--border: #33373c;
		--control-border: #494f56;
		--surface: #23262a;
		--header-bg: #2f3e46;
		--brand: #ffd166;
		--link: #94b8f8;
		--chord: #e3a95c;
		--chorus: #8a7a45;
		--danger: #f08a8a;
		--active-bg: #ffd166;
		--active-text: #23262a;
		--shadow: rgba(0, 0, 0, 0.5);
		--diagram-ink: #e5e3dc;
		--diagram-surface: #23262a;
		--diagram-muted: #7d838b;
	}

	:global(body) {
		margin: 0;
		background: var(--bg);
		color: var(--text);
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
		background: var(--header-bg);
		/* Side insets keep the brand clear of the Dynamic Island in landscape. */
		padding: calc(env(safe-area-inset-top) + 10px) calc(env(safe-area-inset-right) + 16px)
			10px calc(env(safe-area-inset-left) + 16px);
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	/* Landscape on a phone: every vertical pixel counts, the header goes away
	   (navigation stays available through the in-page links). */
	@media (orientation: landscape) and (max-height: 500px) {
		header {
			display: none;
		}
	}

	.brand {
		color: var(--brand);
		font-weight: 700;
		font-size: 17px;
		text-decoration: none;
	}

	.theme {
		font-size: 17px;
		background: none;
		border: none;
		padding: 2px 4px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
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
		color: var(--link);
	}
</style>
