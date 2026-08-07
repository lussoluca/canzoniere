<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { repertoireMemory, type RepertoireMemory } from '$lib/stats';

	// Stats live in localStorage: compute client-side only.
	let memory = $state<RepertoireMemory | null>(null);
	onMount(() => {
		memory = repertoireMemory();
	});
</script>

<svelte:head>
	<title>Memoria del repertorio — Canzoniere</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Memoria del repertorio</h1>
<p class="intro">
	Quello che cantate davvero, quello che state dimenticando e quello che non avete mai provato.
	Tutto calcolato su questo dispositivo.
</p>

{#if memory}
	{#if memory.rediscovery}
		<h2>La riscoperta della settimana</h2>
		<a class="rediscovery" href="{base}/s/{memory.rediscovery.category}/{memory.rediscovery.slug}/">
			<span class="big">🎁 {memory.rediscovery.title}</span>
			<span class="sub">Mai aperto su questo dispositivo: proviamolo questa settimana?</span>
		</a>
	{/if}

	<h2>I vostri classici</h2>
	{#if memory.classics.length > 0}
		<ul class="songs">
			{#each memory.classics as { song, n } (song.category + '/' + song.slug)}
				<li>
					<a href="{base}/s/{song.category}/{song.slug}/">
						<span class="title">{song.title}</span>
						<span class="detail">{n} aperture</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">Ancora niente: i classici emergono usando il canzoniere.</p>
	{/if}

	<h2>Vi state dimenticando di…</h2>
	{#if memory.forgotten.length > 0}
		<ul class="songs">
			{#each memory.forgotten as { song, days } (song.category + '/' + song.slug)}
				<li>
					<a href="{base}/s/{song.category}/{song.slug}/">
						<span class="title">{song.title}</span>
						<span class="detail">non lo fate da {days >= 60 ? `${Math.floor(days / 30)} mesi` : `${days} giorni`}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">Nessun canto dimenticato: o siete costanti, o è presto per dirlo.</p>
	{/if}

	<p class="footnote">
		{memory.neverOpened.length} canti del repertorio non sono mai stati aperti su questo dispositivo.
	</p>
{/if}

<style>
	nav {
		margin-bottom: 8px;
	}

	nav a {
		text-decoration: none;
		font-size: 15px;
	}

	h1 {
		font-size: 24px;
		margin: 0 0 4px;
	}

	.intro {
		margin: 0 0 12px;
		color: var(--muted);
		font-size: 14px;
	}

	h2 {
		font-size: 15px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin: 22px 0 10px;
	}

	.rediscovery {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		text-decoration: none;
		color: inherit;
	}

	.rediscovery .big {
		font-size: 18px;
		font-weight: 600;
	}

	.rediscovery .sub {
		font-size: 13px;
		color: var(--muted);
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
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 10px 4px;
		text-decoration: none;
		color: inherit;
	}

	.songs .title {
		font-weight: 500;
	}

	.songs .detail {
		font-size: 13px;
		color: var(--muted);
		text-align: right;
	}

	.empty {
		color: var(--muted);
		font-size: 14px;
	}

	.footnote {
		margin-top: 24px;
		font-size: 12px;
		color: var(--faint);
	}
</style>
