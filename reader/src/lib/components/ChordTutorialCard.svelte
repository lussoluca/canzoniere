<script lang="ts">
	import ChordDiagram from '@canzoniere/shared/ChordDiagram.svelte';
	import { chordTutorial } from '#lib/chord-tutorial.js';
	import ChordChecker from '#lib/components/ChordChecker.svelte';

	interface Props {
		chord: string;
		subtitle: string;
		open?: boolean;
		onLearned: () => void;
	}

	let { chord, subtitle, open = false, onLearned }: Props = $props();

	const tutorial = $derived(chordTutorial(chord));
</script>

<details class="card" {open} data-testid="chord-tutorial" data-chord={chord}>
	<summary>
		<strong>{chord}</strong>
		<span class="subtitle">{subtitle}</span>
	</summary>
	<div class="body">
		<div class="figure">
			<ChordDiagram name={chord} scale={2.6} />
		</div>
		{#if tutorial}
			<div class="howto">
				<ol>
					{#each tutorial.steps as step, i (i)}
						<li>{step}</li>
					{/each}
				</ol>
				{#if tutorial.open.length > 0}
					<p class="strings">
						Lascia suonare a vuoto: {tutorial.open.join(', ')}.
					</p>
				{/if}
				{#if tutorial.muted.length > 0}
					<p class="strings">
						Non suonare: {tutorial.muted.join(', ')}.
					</p>
				{/if}
				<p class="check">
					Prova le corde una alla volta: se una non suona, avvicina il dito alla barretta
					metallica e premi con la punta, non con il polpastrello piatto.
				</p>
			</div>
		{:else}
			<p class="howto">Per questo accordo non c'è un diagramma nel canzoniere.</p>
		{/if}
	</div>
	<div class="actions">
		<button class="learned" onclick={onLearned}>Segna come imparato</button>
		<ChordChecker {chord} />
	</div>
</details>

<style>
	.card {
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		padding: 0;
	}

	summary {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		padding: var(--space-5) var(--space-6);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		list-style: none;
	}

	summary::-webkit-details-marker {
		display: none;
	}

	summary::after {
		content: '▾';
		margin-left: auto;
		color: var(--muted);
		transition: transform 0.15s;
	}

	.card[open] summary::after {
		transform: rotate(180deg);
	}

	summary strong {
		font-size: var(--text-2xl);
	}

	.subtitle {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.body {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: var(--space-3) var(--space-8);
		padding: 0 var(--space-6);
	}

	.figure {
		flex: 0 0 auto;
	}

	.howto {
		flex: 1 1 220px;
		font-size: var(--text-md);
	}

	.howto ol {
		margin: 0;
		padding-left: var(--space-8);
	}

	.howto li {
		margin-bottom: var(--space-2);
	}

	.strings {
		margin: var(--space-3) 0 0;
	}

	.check {
		margin: var(--space-3) 0 0;
		color: var(--muted);
		font-size: var(--text-sm);
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3) var(--space-5);
		margin: var(--space-5) var(--space-6) var(--space-6);
	}

	.learned {
		font: inherit;
		font-size: var(--text-md);
		font-weight: 500;
		padding: var(--space-3) var(--space-6);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.learned:active {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}
</style>
