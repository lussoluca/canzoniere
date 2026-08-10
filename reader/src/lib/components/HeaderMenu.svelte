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
		<div class="drawer">
			<div class="drawer-head">
				<span>Menu</span>
				<button class="close" onclick={close} aria-label="Chiudi il menu">✕</button>
			</div>
			{#each items as item (item.href)}
				<a href={item.href} onclick={close}>{item.label}</a>
			{/each}
			<div class="divider"></div>
			{#if mounted}
				<button class="drawer-theme" onclick={ontoggletheme}>
					{theme === 'dark' ? '☀️ Tema chiaro' : '🌙 Tema scuro'}
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

	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.35);
		border: none;
		padding: 0;
		z-index: 40;
	}

	.drawer {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: 78%;
		max-width: 320px;
		background: var(--surface);
		color: var(--text);
		z-index: 50;
		box-shadow: -4px 0 24px var(--shadow);
		padding: calc(env(safe-area-inset-top) + 16px) 16px calc(env(safe-area-inset-bottom) + 16px);
		display: flex;
		flex-direction: column;
		gap: 4px;
		box-sizing: border-box;
	}

	.drawer-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
		font-weight: 700;
		font-size: 16px;
	}

	.close {
		font-size: 20px;
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 2px 4px;
		-webkit-tap-highlight-color: transparent;
	}

	.drawer a,
	.drawer-theme {
		padding: 14px 10px;
		text-decoration: none;
		color: inherit;
		border-radius: 10px;
		font-size: 16px;
		text-align: left;
		background: none;
		border: none;
		font-family: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.divider {
		border-top: 1px solid var(--border);
		margin: 8px 0;
	}
</style>
