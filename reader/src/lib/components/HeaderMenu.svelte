<script lang="ts">
	import { base } from '$app/paths';
	import { feedbackHref } from '$lib/feedback';
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
		{ href: `${base}/accordi/`, label: '🎸 Cosa posso suonare' },
		{ href: `${base}/raccolta/`, label: '🎵 Crea un canzoniere' },
		{ href: feedbackHref('Commenti e suggerimenti sul canzoniere'), label: '✉️ Commenti e suggerimenti' }
	];

	let open = $state(false);

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<nav>
	<div class="inline">
		{#each items as item (item.href)}
			<a href={item.href}>{item.label}</a>
		{/each}
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
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-label={open ? 'Chiudi il menu' : 'Apri il menu'}
	>
		☰
	</button>

	{#if open}
		<button class="overlay" onclick={close} aria-label="Chiudi il menu" tabindex="-1"></button>
		<div class="panel">
			{#each items as item (item.href)}
				<a href={item.href} onclick={close}>{item.label}</a>
			{/each}
			<div class="divider"></div>
			{#if mounted}
				<button class="panel-theme" onclick={ontoggletheme}>
					{theme === 'dark' ? '☀️ Tema chiaro' : '🌙 Tema scuro'}
				</button>
			{/if}
		</div>
	{/if}
</nav>

<style>
	/* Anchor for the absolutely-positioned dropdown panel. */
	nav {
		position: relative;
	}

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

	/* Narrow viewport: the inline links don't fit next to the brand, the
	   burger and its drawer take over. */
	@media (max-width: 700px) {
		.inline {
			display: none;
		}

		.burger {
			display: flex;
		}
	}

	/* Transparent click-catcher: closes the menu on a tap anywhere outside
	   the panel without dimming the page for a 4-item dropdown. */
	.overlay {
		position: fixed;
		inset: 0;
		background: transparent;
		border: none;
		padding: 0;
		z-index: 40;
	}

	.panel {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		width: max-content;
		max-width: calc(100vw - 24px);
		background: var(--surface);
		color: var(--text);
		z-index: 50;
		border: 1px solid var(--border);
		border-radius: 14px;
		box-shadow: 0 8px 32px var(--shadow);
		padding: 6px;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}

	.panel a,
	.panel-theme {
		padding: 12px 14px;
		text-decoration: none;
		color: inherit;
		border-radius: 9px;
		font-size: 16px;
		text-align: left;
		background: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		-webkit-tap-highlight-color: transparent;
	}

	.divider {
		border-top: 1px solid var(--border);
		margin: 6px 8px;
	}
</style>
