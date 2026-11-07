<script lang="ts">
	import { resolve } from '$app/paths';
	import { shareLink } from '#lib/share.js';
	import QrSheet from '#lib/components/QrSheet.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// The songbook is a prerendered page, so its address is the whole link.
	function shareUrl(): string {
		return `${location.origin}${location.pathname}`;
	}

	let copied = $state(false);
	let showQr = $state(false);

	async function share() {
		if ((await shareLink(shareUrl(), data.book.label)) !== 'copied') return;
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

<svelte:head><title>{data.book.label} — Canzoniere Alessandria 2</title></svelte:head>
<nav><a href="{resolve('/')}">← Canzonieri</a></nav>
<h1>🗓️ {data.book.label}</h1>

<ol class="songs">
	{#each data.book.songs as song, i (song.category + '/' + song.slug)}
		<li>
			<a
				href={resolve(`s/${song.category}/${song.slug}/?from=${data.book.name}`)}
			>
				<span class="num">{i + 1}.</span>
				<span class="title">{song.title}</span>
				{#if song.artist}<span class="artist">{song.artist}</span>{/if}
			</a>
		</li>
	{/each}
</ol>

<div class="bar">
	<button class="btn" onclick={share}>{copied ? 'Link copiato ✓' : '📤 Condividi'}</button>
	<button class="btn" onclick={() => showQr = true}>⊞ QR code</button>
</div>

{#if data.book.missing.length > 0}
	<p class="missing">
		Voci non trovate: {data.book.missing.join(', ')}
	</p>
{/if}

{#if showQr}
	<QrSheet
		title={data.book.label}
		url={shareUrl()}
		label="QR code del canzoniere"
		hint="Inquadra con la fotocamera di un altro telefono: si apre lo stesso canzoniere."
		onclose={() => showQr = false}
	/>
{/if}

<style>
	nav {
		margin-bottom: var(--space-3);
	}

	nav a {
		text-decoration: none;
		font-size: var(--text-lg);
	}

	h1 {
		font-size: var(--text-4xl);
		margin: 0 0 var(--space-5);
	}

	.songs {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid var(--border);
	}

	.songs a {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		padding: var(--space-5) var(--space-1);
		text-decoration: none;
		color: inherit;
	}

	.num {
		color: var(--faint);
		font-variant-numeric: tabular-nums;
	}

	.title {
		font-weight: 500;
		flex: 1;
	}

	.artist {
		font-size: var(--text-sm);
		color: var(--muted);
		text-align: right;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		margin-top: var(--space-6);
	}

	.btn {
		font: inherit;
		font-size: var(--text-lg);
		padding: var(--space-4) var(--space-7);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.missing {
		margin-top: var(--space-7);
		font-size: var(--text-sm);
		color: var(--danger);
	}
</style>
