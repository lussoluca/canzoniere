<script lang="ts">
	import { onMount } from 'svelte';
	import { dev } from '$app/env';
	import { asset, resolve } from '$app/paths';
	import { loadTheme, saveTheme, applyTheme, type Theme } from '#lib/theme.js';
	import '@canzoniere/shared/tokens.css';
	import HeaderMenu from '#lib/components/HeaderMenu.svelte';

	let { children } = $props();

	// Service worker with an active update flow: the worker script is never
	// taken from the HTTP cache, updates are checked at launch, whenever the
	// app comes back to the foreground and periodically while it stays open.
	// A new version waits installed until the user accepts the banner: the tap
	// tells the worker to take over and reloads onto the fresh cache.
	let updateReady = $state(false);
	let reg = $state<ServiceWorkerRegistration | undefined>(undefined);

	function applyUpdate() {
		reg?.waiting?.postMessage('skip-waiting');
	}

	onMount(() => {
		if (dev || !('serviceWorker' in navigator)) return;

		// Fires when the accepted new worker takes control: load its version.
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			location.reload();
		});

		navigator.serviceWorker.register(`${resolve('/')}service-worker.js`, { updateViaCache: 'none' }).then((r) => {
			reg = r;
			if (r.waiting && navigator.serviceWorker.controller) updateReady = true;
			r.addEventListener('updatefound', () => {
				const fresh = r.installing;
				fresh?.addEventListener('statechange', () => {
					if (fresh.state === 'installed' && navigator.serviceWorker.controller) {
						updateReady = true;
					}
				});
			});
			r.update().catch(() => {});
			})
			.catch(() => {});

		const check = () => reg?.update().catch(() => {});
		const onVisible = () => {
			if (document.visibilityState === 'visible') check();
		};
		document.addEventListener('visibilitychange', onVisible);
		const interval = setInterval(check, 30 * 60 * 1000);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			clearInterval(interval);
		};
	});

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

	// marker for e2e tests: only interact after hydration
	$effect(() => {
		document.body.dataset.hydrated = 'true';
	});
</script>

<div class="app">
	<header>
		<a class="brand" href="{resolve('/')}">
			<img
				class="logo"
				src="{asset('icons/icon-192.png')}"
				alt=""
			/>

			Canzoniere Alessandria 2
		</a>

		<HeaderMenu
			theme={effective}
			mounted={mounted}
			ontoggletheme={toggleTheme}
		/>
	</header>

	<main>
		{@render children()}
	</main>

	{#if updateReady}
		<button class="update" onclick={applyUpdate}>
			✨ Nuova versione pronta — tocca per aggiornare
		</button>
	{/if}
</div>

<style>
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
		padding: calc(env(safe-area-inset-top) + var(--space-4)) calc(env(safe-area-inset-right) + var(--space-7))
			var(--space-4) calc(env(safe-area-inset-left) + var(--space-7));
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
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--brand);
		font-weight: 700;
		font-size: var(--text-xl);
		text-decoration: none;
		min-width: 0;
	}

	.logo {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	main {
		flex: 1;
		width: 100%;
		max-width: 900px;
		margin: 0 auto;
		/* Side insets keep the text clear of the Dynamic Island in landscape. */
		padding: var(--space-7) calc(env(safe-area-inset-right) + var(--space-7))
			calc(env(safe-area-inset-bottom) + var(--space-9)) calc(env(safe-area-inset-left) + var(--space-7));
		box-sizing: border-box;
	}

	:global(a) {
		color: var(--link);
	}

	.update {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		bottom: calc(env(safe-area-inset-bottom) + 16px);
		z-index: 30;
		font: inherit;
		font-size: var(--text-lg);
		font-weight: 600;
		padding: var(--space-5) var(--space-7);
		border: none;
		border-radius: var(--radius-pill);
		background: var(--header-bg);
		color: var(--brand);
		box-shadow: 0 4px 16px var(--shadow);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}
</style>
