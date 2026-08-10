<script lang="ts">
	import { fade, fly } from 'svelte/transition';
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
		{ href: `${base}/accordi/`, icon: '🎸', label: 'Cosa posso suonare' },
		{ href: `${base}/raccolta/`, icon: '🎵', label: 'Crea un canzoniere' },
		{
			href: feedbackHref('Commenti e suggerimenti sul canzoniere'),
			icon: '✉️',
			label: 'Commenti e suggerimenti'
		}
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
			<a href={item.href}>{item.icon} {item.label}</a>
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

	.icon {
		font-size: 19px;
		width: 26px;
		text-align: center;
		flex-shrink: 0;
	}
</style>
