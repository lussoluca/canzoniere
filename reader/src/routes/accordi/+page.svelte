<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		loadKnownChords,
		saveKnownChords,
		chordUsage,
		classify
	} from '$lib/known-chords';

	const usage = chordUsage();

	let known = $state<string[]>([]);
	let ready = $state(false);

	onMount(() => {
		known = loadKnownChords();
		ready = true;
	});

	$effect(() => {
		if (!ready) return;
		saveKnownChords(known);
	});

	function toggle(chord: string) {
		known = known.includes(chord) ? known.filter((c) => c !== chord) : [...known, chord];
	}

	const result = $derived(classify(known));
</script>

<svelte:head>
	<title>Cosa posso suonare — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Cosa posso suonare</h1>
<p class="intro">
	Segna gli accordi che sai fare: il canzoniere ti dice quali canti puoi già accompagnare e quale
	accordo conviene imparare dopo.
</p>

<h2>I miei accordi</h2>
<div class="chips">
	{#each usage as { chord, count } (chord)}
		<button
			class="chip"
			class:on={known.includes(chord)}
			onclick={() => toggle(chord)}
			aria-pressed={known.includes(chord)}
			title="{count} canti"
		>
			{chord}
		</button>
	{/each}
</div>

{#if known.length > 0}
	{#if result.unlocks.length > 0}
		<h2>Il prossimo accordo da imparare</h2>
		<div class="unlocks">
			{#each result.unlocks.slice(0, 5) as u (u.chord)}
				<button class="unlock" onclick={() => toggle(u.chord)} title="Segna {u.chord} come imparato">
					<strong>{u.chord}</strong>
					<span>sblocca {u.count} {u.count === 1 ? 'canto' : 'canti'}</span>
				</button>
			{/each}
		</div>
	{/if}

	<h2>Suonabili subito ({result.playable.length})</h2>
	{#if result.playable.length > 0}
		<ul class="songs">
			{#each result.playable as { song, chords } (song.category + '/' + song.slug)}
				<li>
					<a href="{base}/s/{song.category}/{song.slug}/">
						<span class="title">{song.title}</span>
						<span class="detail">{chords.join(' ')}</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="empty">Ancora nessuno: guarda qui sopra quale accordo ti sblocca di più.</p>
	{/if}

	<h2>Quasi tuoi: manca un accordo ({result.almost.length})</h2>
	<ul class="songs">
		{#each result.almost as { entry, missing } (entry.song.category + '/' + entry.song.slug)}
			<li>
				<a href="{base}/s/{entry.song.category}/{entry.song.slug}/">
					<span class="title">{entry.song.title}</span>
					<span class="detail">manca <strong class="missing">{missing}</strong></span>
				</a>
			</li>
		{/each}
	</ul>

	<p class="later">Più avanti: {result.later.length} canti con due o più accordi da imparare.</p>
{:else if ready}
	<p class="empty">Tocca gli accordi che conosci per iniziare.</p>
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

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.chip {
		font: inherit;
		font-size: 15px;
		min-width: 52px;
		padding: 8px 10px;
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

	.unlocks {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.unlock {
		font: inherit;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		padding: 10px 14px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.unlock strong {
		font-size: 18px;
	}

	.unlock span {
		font-size: 12px;
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

	.missing {
		color: var(--chord);
	}

	.later,
	.empty {
		color: var(--muted);
		font-size: 14px;
	}
</style>
