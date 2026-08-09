<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import {
		loadKnownChords,
		saveKnownChords,
		chordUsage,
		classify
	} from '$lib/known-chords';
	import ChordDiagram from '$songlib/ChordDiagram.svelte';
	import ChordTutorialCard from '$lib/components/ChordTutorialCard.svelte';

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

	// first chords for who starts from zero: the most used in the repertoire
	const starters = usage.slice(0, 3).map(({ chord, count }) => ({ chord, count }));
</script>

<svelte:head>
	<title>Cosa posso suonare — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Cosa posso suonare</h1>
<p class="intro">
	Segna gli accordi che sai fare: il canzoniere ti dice quali canti puoi già accompagnare, quale
	accordo conviene imparare dopo e come si mettono le dita per farlo.
</p>

<details class="guide">
	<summary>Come si legge un diagramma degli accordi</summary>
	<div class="guide-body">
		<div class="guide-figure">
			<ChordDiagram name="Mi" scale={2.6} />
		</div>
		<ul>
			<li>Le linee verticali sono le 6 corde: a sinistra la 6ª (Mi basso, la più grossa), a destra la 1ª (Mi cantino, la più sottile).</li>
			<li>Le linee orizzontali sono le barrette metalliche sul manico: lo spazio tra due barrette è un tasto.</li>
			<li>I pallini pieni dicono dove premere; il numero dentro è il dito: 1 indice, 2 medio, 3 anulare, 4 mignolo.</li>
			<li>Un cerchietto sopra la corda = suona la corda a vuoto, senza premere. Una ✕ = quella corda non va suonata.</li>
			<li>Se accanto al diagramma c'è un numero, la griglia parte da quel tasto invece che dal capotasto.</li>
		</ul>
	</div>
	<p class="guide-tips">
		Premi con la punta delle dita, vicino alla barretta verso il corpo della chitarra, e tieni il
		pollice dietro il manico. All'inizio le dita fanno male: è normale, passa in pochi giorni.
	</p>
</details>

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
		<div class="tutorials">
			{#each result.unlocks.slice(0, 5) as u, i (u.chord)}
				<ChordTutorialCard
					chord={u.chord}
					subtitle="sblocca {u.count} {u.count === 1 ? 'canto' : 'canti'}"
					open={i === 0}
					onLearned={() => toggle(u.chord)}
				/>
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
	<p class="empty">
		Tocca gli accordi che conosci qui sopra. Non ne conosci ancora nessuno? Parti da questi: sono
		i più usati in tutto il canzoniere.
	</p>
	<div class="tutorials">
		{#each starters as s, i (s.chord)}
			<ChordTutorialCard
				chord={s.chord}
				subtitle="usato in {s.count} {s.count === 1 ? 'canto' : 'canti'}"
				open={i === 0}
				onLearned={() => toggle(s.chord)}
			/>
		{/each}
	</div>
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

	.tutorials {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.guide {
		margin: 0 0 12px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
	}

	.guide summary {
		padding: 10px 14px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.guide-body {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px 20px;
		padding: 0 14px;
	}

	.guide-figure {
		flex: 0 0 auto;
	}

	.guide-body ul {
		flex: 1 1 220px;
		margin: 0;
		padding-left: 20px;
		font-size: 14px;
	}

	.guide-body li {
		margin-bottom: 6px;
	}

	.guide-tips {
		margin: 8px 0 0;
		padding: 0 14px 12px;
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

	.missing {
		color: var(--chord);
	}

	.later,
	.empty {
		color: var(--muted);
		font-size: 14px;
	}
</style>
