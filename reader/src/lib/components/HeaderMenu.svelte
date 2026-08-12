<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import { base } from '$app/paths';
	import { feedbackHref } from '$lib/feedback';
	import {
		loadSharedCollections,
		forgetSharedCollection,
		sharedCollectionQuery,
		type SharedCollection
	} from '$lib/shared-collections';
	import type { Theme } from '$lib/theme';

	let {
		theme,
		mounted,
		ontoggletheme
	}: {
		theme: Theme;
		mounted: boolean;
		ontoggletheme: () => void;
	} = $props();

	const items = [
		{ href: `${base}/accordi/`, icon: '🎸', label: 'Cosa posso suonare' },
		{ href: `${base}/raccolta/`, icon: '🎵', label: 'Crea un canzoniere' },
		{
			href: feedbackHref('Commenti e suggerimenti sul canzoniere'),
			icon: '✉️',
			label: 'Commenti e suggerimenti'
		}
	];

	let open = $state(false);

	// Temporary songbooks received via link/QR, kept in localStorage. Loaded
	// after every navigation (afterNavigate also fires on the initial load,
	// once the destination page has mounted and remembered its set) and again
	// when a menu opens, so a set received mid-session shows up right away.
	let shared = $state<SharedCollection[]>([]);
	let sharedOpen = $state(false);

	afterNavigate(() => {
		shared = loadSharedCollections();
	});

	function sharedHref(c: SharedCollection): string {
		return `${base}/raccolta/?${sharedCollectionQuery(c)}`;
	}

	function forget(c: SharedCollection) {
		shared = forgetSharedCollection(c.l);
	}

	function toggleDrawer() {
		if (!open) shared = loadSharedCollections();
		open = !open;
	}

	function toggleShared() {
		if (!sharedOpen) shared = loadSharedCollections();
		sharedOpen = !sharedOpen;
	}

	function close() {
		open = false;
		sharedOpen = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<nav>
	<div class="inline">
		{#each items as item (item.href)}
			<a href={item.href}>{item.icon} {item.label}</a>
		{/each}
		{#if shared.length > 0}
			<div class="inline-shared">
				<button class="inline-shared-toggle" onclick={toggleShared} aria-expanded={sharedOpen}>
					🎶 Canzonieri temporanei
				</button>
				{#if sharedOpen}
					<button
						class="inline-shared-dismiss"
						onclick={() => (sharedOpen = false)}
						aria-label="Chiudi i canzonieri temporanei"
						tabindex="-1"
					></button>
					<div class="inline-shared-panel">
						{#each shared as c (c.l)}
							<div class="inline-shared-row">
								<!-- Full page load: the raccolta page reads its params on mount,
								     so a client-side hop from /raccolta/ would not refresh it. -->
								<a href={sharedHref(c)} data-sveltekit-reload onclick={close}>
									{c.t || 'Canzoniere'}
								</a>
								<button
									class="forget"
									onclick={() => forget(c)}
									aria-label="Dimentica «{c.t || 'Canzoniere'}»"
								>
									✕
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
		{#if mounted}
			<button
				class="theme"
				onclick={ontoggletheme}
				aria-label={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
			>
				{theme === 'dark' ? '☀️' : '🌙'}
			</button>
		{/if}
	</div>

	<button
		class="burger"
		onclick={toggleDrawer}
		aria-expanded={open}
		aria-label={open ? 'Chiudi il menu' : 'Apri il menu'}
	>
		☰
	</button>

	{#if open}
		<button
			class="overlay"
			onclick={close}
			aria-label="Chiudi il menu"
			tabindex="-1"
			transition:fade={{ duration: 150 }}
		></button>
		<div class="drawer" transition:fly={{ x: -320, duration: 220, opacity: 1 }}>
			<div class="drawer-brand">Canzoniere</div>
			{#each items as item (item.href)}
				<a href={item.href} onclick={close}>
					<span class="icon">{item.icon}</span>
					{item.label}
				</a>
			{/each}
			{#if shared.length > 0}
				<div class="drawer-section">Canzonieri temporanei</div>
				{#each shared as c (c.l)}
					<div class="drawer-row">
						<!-- Full page load: the raccolta page reads its params on mount,
						     so a client-side hop from /raccolta/ would not refresh it. -->
						<a href={sharedHref(c)} data-sveltekit-reload onclick={close}>
							<span class="icon">🎶</span>
							<span class="drawer-row-title">{c.t || 'Canzoniere'}</span>
						</a>
						<button
							class="forget"
							onclick={() => forget(c)}
							aria-label="Dimentica «{c.t || 'Canzoniere'}»"
						>
							✕
						</button>
					</div>
				{/each}
			{/if}
			{#if mounted}
				<button class="drawer-theme" onclick={ontoggletheme}>
					<span class="icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
					{theme === 'dark' ? 'Tema chiaro' : 'Tema scuro'}
				</button>
			{/if}
		</div>
	{/if}
</nav>

<style>
	.inline {
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.inline a {
		color: #e5e3dc;
		text-decoration: none;
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
	}

	.theme {
		font-size: 17px;
		background: none;
		border: none;
		padding: 2px 4px;
		/* Fixed height (same as the logo) so the header height does not depend
		   on the emoji font's line box, which varies across platforms. */
		height: 28px;
		display: flex;
		align-items: center;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.inline-shared {
		position: relative;
	}

	.inline-shared-toggle {
		color: #e5e3dc;
		font-family: inherit;
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* Invisible click-catcher: a click anywhere else closes the dropdown. */
	.inline-shared-dismiss {
		position: fixed;
		inset: 0;
		background: none;
		border: none;
		padding: 0;
		z-index: 44;
	}

	.inline-shared-panel {
		position: absolute;
		top: calc(100% + 12px);
		right: 0;
		z-index: 45;
		min-width: 230px;
		max-width: 320px;
		background: var(--surface);
		color: var(--text);
		border: 1px solid var(--control-border);
		border-radius: 12px;
		box-shadow: 0 8px 24px var(--shadow);
		padding: 6px;
	}

	.inline-shared-row {
		display: flex;
		align-items: center;
	}

	.inline-shared-row a {
		flex: 1;
		min-width: 0;
		padding: 10px 12px;
		border-radius: 8px;
		color: inherit;
		text-decoration: none;
		font-size: 15px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inline-shared-row a:hover {
		background: var(--bg);
	}

	.forget {
		font-family: inherit;
		font-size: 13px;
		background: none;
		border: none;
		border-radius: 8px;
		color: var(--muted);
		padding: 10px 12px;
		cursor: pointer;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.forget:active {
		background: var(--surface);
	}

	.burger {
		display: none;
		font-size: 22px;
		background: none;
		border: none;
		color: var(--brand);
		padding: 2px 4px;
		height: 28px;
		align-items: center;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	/* Up to iPad portrait and small-iPad landscape the inline links feel
	   cramped next to the brand, the burger and its drawer take over. */
	@media (max-width: 1024px) {
		.inline {
			display: none;
		}

		.burger {
			display: flex;
		}
	}

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.45);
		border: none;
		padding: 0;
		z-index: 40;
	}

	/* Full-height sheet from the left; the page stays visible on the right
	   under the dimmed overlay. */
	.drawer {
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		width: 82%;
		max-width: 320px;
		background: var(--bg);
		color: var(--text);
		z-index: 50;
		border-radius: 0 24px 24px 0;
		box-shadow: 4px 0 32px var(--shadow);
		padding: calc(env(safe-area-inset-top) + 20px) 14px calc(env(safe-area-inset-bottom) + 20px)
			calc(env(safe-area-inset-left) + 14px);
		display: flex;
		flex-direction: column;
		gap: 2px;
		box-sizing: border-box;
	}

	.drawer-brand {
		font-size: 22px;
		font-weight: 700;
		padding: 6px 12px 22px;
	}

	.drawer a,
	.drawer-theme {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 12px;
		text-decoration: none;
		color: inherit;
		border-radius: 14px;
		font-size: 17px;
		text-align: left;
		background: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.drawer a:active,
	.drawer-theme:active {
		background: var(--surface);
	}

	.drawer-section {
		font-size: 13px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		padding: 18px 12px 6px;
	}

	.drawer-row {
		display: flex;
		align-items: center;
	}

	.drawer-row a {
		flex: 1;
		min-width: 0;
	}

	.drawer-row-title {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.icon {
		font-size: 19px;
		width: 26px;
		text-align: center;
		flex-shrink: 0;
	}

	/* Rotating the device past the breakpoint while the drawer is open would
	   otherwise leave it on screen next to the inline links. */
	@media (min-width: 1025px) {
		.overlay,
		.drawer {
			display: none;
		}
	}
</style>
