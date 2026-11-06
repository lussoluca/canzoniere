<script lang="ts">
	import ChordDiagram from '@canzoniere/shared/ChordDiagram.svelte';
	import FretboardMap from '#lib/components/FretboardMap.svelte';
	import {
		changeSentence,
		chordNotes,
		chordVoicing,
		stringLabel,
		voicingDiff
	} from '#lib/harmony.js';

	const ROOTS = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
	const EXTRAS = [
		{ id: '', label: 'niente' },
		{ id: '7', label: '7ª' },
		{ id: 'maj7', label: '7ª maggiore' },
		{ id: 'sus4', label: 'sus4' }
	];

	let root = $state('La');
	let minor = $state(true);
	let extra = $state('7');

	// the major seventh is not offered on minor chords: "Lammaj7" is not a name
	// that shows up in the songbook
	$effect(() => {
		if (minor && extra === 'maj7') extra = '7';
	});

	// sus4 replaces the third, so the chord is neither major nor minor
	const triad = $derived(root + (minor ? 'm' : ''));
	const chord = $derived(
		extra === '' ? triad : extra === 'sus4' ? `${root}sus4` : `${triad}${extra}`
	);

	const triadVoicing = $derived(chordVoicing(triad));
	const fullVoicing = $derived(chordVoicing(chord));
	const changes = $derived(
		triadVoicing && fullVoicing && extra !== ''
			? voicingDiff(triadVoicing, fullVoicing)
			: []
	);
	const notes = $derived(fullVoicing ? chordNotes(fullVoicing) : []);
	const highlight = $derived(fullVoicing?.strings.map((s) => s.fret) ?? []);
	const changed = $derived(new Set(changes.map((c) => c.string)));
</script>

<div class="builder">
	<div class="controls">
		<div class="picker">
			<span class="picker-label" id="builder-root">Fondamentale</span>
			<div class="chips" role="group" aria-labelledby="builder-root">
				{#each ROOTS as r (r)}
					<button class="chip" class:on={root === r} aria-pressed={root === r} onclick={() => (root = r)}>
						{r}
					</button>
				{/each}
			</div>
		</div>
		<div class="picker">
			<span class="picker-label" id="builder-quality">Tipo</span>
			<div class="chips" role="group" aria-labelledby="builder-quality">
				<button class="chip" class:on={!minor} aria-pressed={!minor} onclick={() => (minor = false)}>
					maggiore
				</button>
				<button class="chip" class:on={minor} aria-pressed={minor} onclick={() => (minor = true)}>
					minore
				</button>
			</div>
		</div>
		<div class="picker">
			<span class="picker-label" id="builder-extra">Aggiungi</span>
			<div class="chips" role="group" aria-labelledby="builder-extra">
				{#each EXTRAS as e (e.id)}
					<button
						class="chip"
						class:on={extra === e.id}
						aria-pressed={extra === e.id}
						disabled={minor && e.id === 'maj7'}
						onclick={() => (extra = e.id)}
					>
						{e.label}
					</button>
				{/each}
			</div>
		</div>
	</div>

	<div class="shapes">
		<figure>
			<ChordDiagram name={triad} scale={2.2} />
			<figcaption>la triade di partenza</figcaption>
		</figure>
		{#if extra !== ''}
			<div class="arrow" aria-hidden="true">➜</div>
			<figure>
				<ChordDiagram name={chord} scale={2.2} />
				<figcaption>
					{#if extra === 'sus4'}con la quarta al posto della terza{:else}con la nota aggiunta{/if}
				</figcaption>
			</figure>
		{/if}
	</div>

	{#if fullVoicing}
		<p class="recipe">
			<strong>{chord}</strong> è fatto di
			{#each notes as n, i (n.interval)}{i > 0 ? ', ' : ' '}<span class="note">{n.note}</span> ({n.role}){/each}.
		</p>
	{/if}

	{#if extra === ''}
		<p class="hint">Scegli cosa aggiungere e guarda quale dito si sposta.</p>
	{:else if changes.length === 0}
		<p class="hint">Su questa fondamentale la posizione non cambia: cambiano solo le note che lasci suonare.</p>
	{:else}
		<ul class="changes">
			{#each changes as c (c.string)}
				<li>{changeSentence(c, chord)}</li>
			{/each}
		</ul>
	{/if}

	{#if triadVoicing && fullVoicing}
		<div class="scroller">
			<table class="notes">
				<thead>
					<tr>
						<th scope="col">Corda</th>
						<th scope="col">{triad}</th>
						{#if extra !== ''}<th scope="col">{chord}</th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each triadVoicing.strings as s (s.string)}
						{@const after = fullVoicing.strings[s.string]}
						<tr class:diff={changed.has(s.string)}>
							<th scope="row">{stringLabel(s.string)}</th>
							<td>
								{#if s.note}{s.note} <span class="role">{s.roleShort}</span>{:else}✕{/if}
							</td>
							{#if extra !== ''}
								<td>
									{#if after.note}{after.note} <span class="role">{after.roleShort}</span>{:else}✕{/if}
								</td>
							{/if}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="caption">Dove stanno queste note sul manico:</p>
		<FretboardMap {highlight} />
	{:else}
		<p class="hint">Per {chord} non c'è un diagramma nel canzoniere.</p>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-bottom: var(--space-5);
	}

	.picker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}

	.picker-label {
		font-size: var(--text-sm);
		color: var(--muted);
		min-width: 92px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.chip {
		font: inherit;
		font-size: var(--text-md);
		padding: var(--space-1) var(--space-4);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-pill);
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

	.chip:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.shapes {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: var(--space-1) var(--space-7);
		margin-bottom: var(--space-4);
	}

	.shapes figure {
		margin: 0;
		text-align: center;
		max-width: 140px;
	}

	.shapes figcaption {
		font-size: var(--text-xs);
		color: var(--muted);
		margin-top: 2px;
	}

	.arrow {
		font-size: var(--text-3xl);
		color: var(--muted);
	}

	.recipe {
		margin: 0 0 var(--space-3);
	}

	.note {
		color: var(--chord);
		font-weight: 600;
	}

	.changes {
		margin: 0 0 var(--space-4);
		padding-left: var(--space-8);
	}

	.changes li {
		margin-bottom: var(--space-1);
	}

	.hint {
		color: var(--muted);
		font-size: var(--text-sm);
	}

	.scroller {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin-bottom: var(--space-5);
	}

	table.notes {
		border-collapse: collapse;
		font-size: var(--text-sm);
		width: 100%;
		min-width: 280px;
		max-width: 520px;
	}

	table.notes th,
	table.notes td {
		border-bottom: 1px solid var(--border);
		padding: var(--space-1) var(--space-2);
		text-align: left;
		white-space: nowrap;
	}

	table.notes thead th {
		font-size: var(--text-xs);
		letter-spacing: 0.04em;
		color: var(--muted);
	}

	table.notes tbody th {
		font-weight: 400;
		color: var(--muted);
	}

	table.notes tr.diff td:last-child {
		color: var(--chord);
		font-weight: 700;
	}

	.role {
		color: var(--faint);
		font-size: var(--text-xs);
	}

	table.notes tr.diff td:last-child .role {
		color: inherit;
	}

	.caption {
		margin: 0 0 var(--space-2);
		font-size: var(--text-sm);
		color: var(--muted);
	}
</style>
