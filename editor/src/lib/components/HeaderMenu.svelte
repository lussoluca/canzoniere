<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { base } from '$app/paths';
	import { online } from '$lib/online';
	import { pendingCount } from '$lib/pending.svelte';

	const items = online
		? [
				{ href: `${base}/`, icon: '🎵', label: 'Canzoni' },
				{ href: `${base}/invia`, icon: '📤', label: 'Invia modifiche', badge: true },
				{ href: `${base}/help`, icon: '📖', label: 'Guida' }
			]
		: [
				{ href: `${base}/`, icon: '🎵', label: 'Canzoni' },
				{ href: `${base}/songbooks`, icon: '📚', label: 'Canzonieri' },
				{ href: `${base}/categories`, icon: '📁', label: 'Categorie' },
				{ href: `${base}/help`, icon: '📖', label: 'Guida' }
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
			<a href={item.href} class:send={item.badge}>
				{item.label}{#if item.badge && pendingCount() > 0}&nbsp;<span class="badge"
						>{pendingCount()}</span
					>{/if}
			</a>
		{/each}
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
		gap: 1rem;
	}

	.inline a {
		color: #cdd7da;
		text-decoration: none;
		font-size: 0.92rem;
		white-space: nowrap;
	}

	.inline a:hover {
		color: #fff;
	}

	.inline a.send {
		color: #ffd166;
		font-weight: 600;
	}

	.badge {
		display: inline-block;
		min-width: 1.2em;
		text-align: center;
		background: #ffd166;
		color: #2f3e46;
		border-radius: 999px;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 0.05rem 0.35rem;
	}

	.burger {
		display: none;
		font-size: 22px;
		background: none;
		border: none;
		color: #ffd166;
		padding: 2px 4px;
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
		background: rgba(0, 0, 0, 0.45);
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
		background: #f6f5f2;
		color: #2b2b2b;
		z-index: 50;
		border-radius: 0 24px 24px 0;
		box-shadow: 4px 0 32px rgba(0, 0, 0, 0.3);
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

	.drawer a {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 14px 12px;
		text-decoration: none;
		color: inherit;
		border-radius: 14px;
		font-size: 17px;
		-webkit-tap-highlight-color: transparent;
	}

	.drawer a:active {
		background: #fff;
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
