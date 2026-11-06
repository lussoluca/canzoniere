<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { online } from '#lib/online.js';
	import { pendingCount } from '#lib/pending.svelte.js';

	const items = online
		? [
			{ href: resolve('/'), icon: '🎵', label: 'Canzoni' },
			{
				href: resolve(`invia`),
				icon: '📤',
				label: 'Invia modifiche',
				badge: true
			},
			{ href: resolve(`help`), icon: '📖', label: 'Guida' }
		]
		: [
			{ href: resolve('/'), icon: '🎵', label: 'Canzoni' },
			{ href: resolve(`songbooks`), icon: '📚', label: 'Canzonieri' },
			{ href: resolve(`categories`), icon: '📁', label: 'Categorie' },
			{ href: resolve(`help`), icon: '📖', label: 'Guida' }
		];

	let open = $state(false);

	function close() {
		open = false;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown}></svelte:window>

<nav>
	<div class="inline">
		{#each items as item (item.href)}
			<a href={item.href} class:send={item.badge}>
				{item.label}{#if item.badge && pendingCount() > 0}
					<span class="badge">{pendingCount()}</span>
				{/if}
			</a>
		{/each}
	</div>

	<button
		class="burger"
		onclick={() => open = !open}
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
					{#if item.badge && pendingCount() > 0}
						<span class="badge">{pendingCount()}</span>
					{/if}
				</a>
			{/each}
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
		font-size: var(--text-lg);
		white-space: nowrap;
	}

	.inline a:hover {
		color: var(--header-text-hover);
	}

	.inline a.send {
		color: var(--brand);
		font-weight: 600;
	}

	.badge {
		display: inline-block;
		min-width: 1.2em;
		text-align: center;
		background: var(--brand);
		color: var(--header-bg);
		border-radius: var(--radius-pill);
		font-size: var(--text-xs);
		font-weight: 700;
		padding: 0.05rem var(--space-2);
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

	/* Below iPad landscape the inline links feel cramped next to the brand:
	   the burger and its drawer take over (same breakpoint as the reader). */
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

	/* Full-height sheet from the left, same look as the reader's drawer. */
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
		box-shadow: 4px 0 32px var(--shadow-lg);
		padding: calc(env(safe-area-inset-top) + var(--space-8)) var(--space-6)
			calc(env(safe-area-inset-bottom) + var(--space-8)) calc(env(safe-area-inset-left) + var(--space-6));
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

	.drawer a {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		padding: var(--space-6) var(--space-5);
		text-decoration: none;
		color: inherit;
		border-radius: var(--radius-lg);
		font-size: var(--text-2xl);
		-webkit-tap-highlight-color: transparent;
	}

	.drawer a:active {
		background: var(--surface);
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
