<script lang="ts">
	import ChordDiagram from '$songlib/ChordDiagram.svelte';
	import { chordTutorial } from '$lib/chord-tutorial';
	import ChordChecker from '$lib/components/ChordChecker.svelte';

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
				<ChordChecker {chord} />
			</div>
		{:else}
			<p class="howto">Per questo accordo non c'è un diagramma nel canzoniere.</p>
		{/if}
	</div>
	<button class="learned" onclick={onLearned}>Segna come imparato</button>
</details>

<style>
	.card {
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		padding: 0;
	}

	summary {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 12px 14px;
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
		font-size: 18px;
	}

	.subtitle {
		font-size: 13px;
		color: var(--muted);
	}

	.body {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px 20px;
		padding: 0 14px;
	}

	.figure {
		flex: 0 0 auto;
	}

	.howto {
		flex: 1 1 220px;
		font-size: 14px;
	}

	.howto ol {
		margin: 0;
		padding-left: 20px;
	}

	.howto li {
		margin-bottom: 6px;
	}

	.strings {
		margin: 8px 0 0;
	}

	.check {
		margin: 8px 0 0;
		color: var(--muted);
		font-size: 13px;
	}

	.learned {
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		margin: 12px 14px 14px;
		padding: 8px 14px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
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
