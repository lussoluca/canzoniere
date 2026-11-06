<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { afterNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		loadSavedCollections,
		forgetCollection,
		savedCollectionQuery,
		type SavedCollection
	} from '#lib/saved-collections.js';
	import type { Theme } from '#lib/theme.js';

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
		{
			href: resolve(`impara/`),
			icon: '🎓',
			label: 'Impara la chitarra'
		},

		{
			href: resolve(`accordi/`),
			icon: '🎸',
			label: 'Cosa posso suonare'
		},

		{
			href: resolve(`raccolta/`),
			icon: '🎵',
			label: 'Crea una scaletta'
		},

		{
			href: resolve(`suggerimenti/`),
			icon: '💬',
			label: 'Commenti e suggerimenti'
		},

		{
			href: resolve(`impostazioni/`),
			icon: '⚙️',
			label: 'Impostazioni'
		},
		{ href: resolve(`crediti/`), icon: '📜', label: 'Crediti' }
	];

	let open = $state(false);

	// Temporary songbooks built on this device or received via link/QR, kept in
	// localStorage. Loaded after every navigation (afterNavigate also fires on
	// the initial load, once the destination page has mounted and remembered
	// its set) and again when a menu opens, so a set created or received
	// mid-session shows up right away.
	let shared = $state<SavedCollection[]>([]);
	let sharedOpen = $state(false);

	afterNavigate(({ shallow }) => {
		if (shallow) return;

		shared = loadSavedCollections();
	});

	function sharedHref(c: SavedCollection): string {
		return resolve(`raccolta/?${savedCollectionQuery(c)}`);
	}

	function forget(c: SavedCollection) {
		shared = forgetCollection(c);
	}

	function toggleDrawer() {
		if (!open) shared = loadSavedCollections();
		open = !open;
	}

	function toggleShared() {
		if (!sharedOpen) shared = loadSavedCollections();
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

<svelte:window onkeydown={onKeydown}></svelte:window>

<nav>
	<div class="inline">
		{#each items as item (item.href)}
			<a href={item.href}>{item.icon} {item.label}</a>
		{/each}
		{#if shared.length > 0}
			<div class="inline-shared">
				<button class="inline-shared-toggle" onclick={toggleShared} aria-expanded={sharedOpen}>
					🎶 Scalette temporanee
				</button>
				{#if sharedOpen}
					<button
						class="inline-shared-dismiss"
						onclick={() => sharedOpen = false}
						aria-label="Chiudi le scalette temporanee"
						tabindex="-1"
					></button>
					<div class="inline-shared-panel">
						{#each shared as c (c.id ?? c.l)}
							<div class="inline-shared-row">
								<!-- Full page load: the raccolta page reads its params on mount,
								     so a client-side hop from /raccolta/ would not refresh it. -->
								<a href={sharedHref(c)} data-sveltekit-reload onclick={close}>
									{c.t || 'Scaletta'}
								</a>
								<button
									class="forget"
									onclick={() => forget(c)}
									aria-label="Dimentica «{c.t || 'Scaletta'}»"
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
				<div class="drawer-section">Scalette temporanee</div>
				{#each shared as c (c.id ?? c.l)}
					<div class="drawer-row">
						<!-- Full page load: the raccolta page reads its params on mount,
						     so a client-side hop from /raccolta/ would not refresh it. -->
						<a href={sharedHref(c)} data-sveltekit-reload onclick={close}>
							<span class="icon">🎶</span>
							<span class="drawer-row-title">{c.t || 'Scaletta'}</span>
						</a>
						<button
							class="forget"
							onclick={() => forget(c)}
							aria-label="Dimentica «{c.t || 'Scaletta'}»"
						>
							✕
						</button>
					</div>
				{/each}
			{/if}
			{#if mounted}
				<div class="drawer-sep"></div>
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
		gap: var(--space-7);
	}

	.inline a {
		color: var(--header-text);
		text-decoration: none;
		font-size: var(--text-md);
		font-weight: 500;
		white-space: nowrap;
	}

	.theme {
		font-size: var(--text-2xl);
		background: none;
		border: none;
		padding: 2px var(--space-1);
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
		color: var(--header-text);
		font-family: inherit;
		font-size: var(--text-md);
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
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 24px var(--shadow);
		padding: var(--space-2);
	}

	.inline-shared-row {
		display: flex;
		align-items: center;
	}

	.inline-shared-row a {
		flex: 1;
		min-width: 0;
		padding: var(--space-4) var(--space-5);
		border-radius: var(--radius-md);
		color: inherit;
		text-decoration: none;
		font-size: var(--text-lg);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.inline-shared-row a:hover {
		background: var(--bg);
	}

	.forget {
		font-family: inherit;
		font-size: var(--text-sm);
		background: none;
		border: none;
		border-radius: var(--radius-md);
		color: var(--muted);
		padding: var(--space-4) var(--space-5);
		cursor: pointer;
		flex-shrink: 0;
		-webkit-tap-highlight-color: transparent;
	}

	.forget:active {
		background: var(--surface);
	}

	.burger {
		display: none;
		font-size: var(--text-3xl);
		background: none;
		border: none;
		color: var(--brand);
		padding: 2px var(--space-1);
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
		background: var(--overlay);
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
		border-radius: 0 var(--radius-xl) var(--radius-xl) 0;
		box-shadow: 4px 0 32px var(--shadow);
		padding: calc(env(safe-area-inset-top) + var(--space-8)) var(--space-6) calc(env(safe-area-inset-bottom) + var(--space-8))
			calc(env(safe-area-inset-left) + var(--space-6));
		display: flex;
		flex-direction: column;
		gap: 2px;
		box-sizing: border-box;
	}

	.drawer-brand {
		font-size: var(--text-3xl);
		font-weight: 700;
		padding: var(--space-2) var(--space-5) var(--space-8);
	}

	.drawer a,
	.drawer-theme {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-6) var(--space-5);
		text-decoration: none;
		color: inherit;
		border-radius: var(--radius-lg);
		font-size: var(--text-2xl);
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

	.drawer-sep {
		height: 1px;
		background: var(--border);
		margin: var(--space-4) var(--space-5);
	}

	.drawer-section {
		font-size: var(--text-sm);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		padding: var(--space-7) var(--space-5) var(--space-2);
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
		font-size: var(--text-2xl);
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
