<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { CONTEXTS, ENERGIES, suggest, taggedSongs } from '$lib/moments';
	import { loadFavorites, favoriteKey } from '$lib/favorites';

	let contextId = $state<string | null>(null);
	let moment = $state<string | null>(null);
	let energy = $state<string | null>(null);

	let favorites = $state<Set<string>>(new Set());
	onMount(() => {
		favorites = new Set(loadFavorites());
	});

	const context = $derived(CONTEXTS.find((c) => c.id === contextId));

	// Favorites first: the group's live repertoire is the best suggestion.
	const results = $derived.by(() => {
		if (!moment) return [];
		return suggest(moment, energy).sort((a, b) => {
			const fa = favorites.has(favoriteKey(a.song.category, a.song.slug)) ? 0 : 1;
			const fb = favorites.has(favoriteKey(b.song.category, b.song.slug)) ? 0 : 1;
			return fa - fb || a.song.title.localeCompare(b.song.title, 'it');
		});
	});

	function pickContext(id: string) {
		contextId = id;
		moment = null;
	}
</script>

<svelte:head>
	<title>Che si canta ora — Canzoniere</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Che si canta ora?</h1>
<p class="intro">Due domande e il canzoniere propone i canti adatti al momento.</p>

<h2>Dove siete?</h2>
<div class="chips">
	{#each CONTEXTS as c (c.id)}
		<button class="chip" class:on={contextId === c.id} onclick={() => pickContext(c.id)}>
			{c.id === 'fuoco' ? '🔥' : '⛪'} {c.label}
		</button>
	{/each}
</div>

{#if context}
	<h2>Che momento è?</h2>
	<div class="chips">
		{#each context.moments as m (m)}
			<button class="chip" class:on={moment === m} onclick={() => (moment = moment === m ? null : m)}>
				{m}
			</button>
		{/each}
	</div>

	<h2>Che aria serve?</h2>
	<div class="chips">
		{#each ENERGIES as e (e)}
			<button class="chip" class:on={energy === e} onclick={() => (energy = energy === e ? null : e)}>
				{e === 'calmo' ? '🌙' : e === 'medio' ? '🙂' : '🎉'} {e}
			</button>
		{/each}
	</div>
{/if}

{#if moment}
	<h2>Proposte</h2>
	{#if results.length > 0}
		<ul class="songs">
			{#each results as { song, energy: e } (song.category + '/' + song.slug)}
				<li>
					<a href="{base}/s/{song.category}/{song.slug}/">
						<span class="title">
							{#if favorites.has(favoriteKey(song.category, song.slug))}★{/if}
							{song.title}
						</span>
						{#if e}<span class="detail">{e}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">
			Nessun canto etichettato per questo momento{energy ? ' con questa aria' : ''}. Le etichette si
			aggiungono nei file dei canti con le direttive <code>{'{x_momento:...}'}</code> e
			<code>{'{x_energia:...}'}</code>.
		</p>
	{/if}
{/if}

<p class="footnote">{taggedSongs().length} canti etichettati nel repertorio.</p>

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
		margin: 20px 0 10px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		font: inherit;
		font-size: 15px;
		padding: 9px 14px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.chip.on {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
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
