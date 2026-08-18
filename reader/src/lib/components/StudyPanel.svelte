<script lang="ts">
	// "Study this song": the primer's tools aimed at one song. Three steps, in
	// the order they are useful: the chords the song needs, the changes it
	// actually asks for, then playing it along with the copilot.
	import ChordTutorialCard from '$lib/components/ChordTutorialCard.svelte';
	import ChordChange from '$lib/components/ChordChange.svelte';
	import StrumTrainer from '$lib/components/StrumTrainer.svelte';
	import { tick } from 'svelte';
	import { loadStudyStep, saveStudyStep, type StudyStep } from '$lib/study';

	interface Props {
		category: string;
		slug: string;
		chords: string[]; // the song's chords, as the reader sees them
		changes: { from: string; to: string; count: number }[];
		known: string[];
		onknown: (chord: string) => void;
		onplay: () => void;
		onclose: () => void;
	}

	let { category, slug, chords, changes, known, onknown, onplay, onclose }: Props = $props();

	const STEPS: { id: StudyStep; label: string }[] = [
		{ id: 'chords', label: '1. Accordi' },
		{ id: 'changes', label: '2. Cambi' },
		{ id: 'play', label: '3. Suona' }
	];

	let step = $state<StudyStep>('chords');

	// The step is per song: reload it when the song changes, save it as the
	// reader moves through the panel.
	$effect(() => {
		step = loadStudyStep(category, slug);
	});

	let pair = $state(0);
	const change = $derived(changes[Math.min(pair, changes.length - 1)]);

	const missing = $derived(chords.filter((c) => !known.includes(c)));

	let panel: HTMLElement;

	// Each step is a different height, so changing step leaves the reader
	// somewhere in the middle of the new one. Bring the panel's head back up,
	// just below the sticky controls of the song page. The jump is instant on
	// purpose: a smooth scroll started while the document is still shrinking
	// (the tall "cambi" step giving way to the short "suona" one) is cut off by
	// the browser clamping the scroll position, and the panel never arrives.
	function scrollToPanel() {
		const controls = document.querySelector('.controls');
		const stuck = controls
			? parseFloat(getComputedStyle(controls).top) + controls.getBoundingClientRect().height
			: 0;
		const top = panel.getBoundingClientRect().top + window.scrollY - stuck - 8;
		window.scrollTo(0, Math.max(0, top));
	}

	// The scroll waits for the new step to be in the page and laid out: going
	// from the tall "cambi" step to the short "suona" one makes the document
	// shrink, and a scroll asked for before that lands nowhere.
	async function go(next: StudyStep) {
		step = next;
		saveStudyStep(category, slug, next);
		await tick();
		requestAnimationFrame(scrollToPanel);
	}
</script>

<div class="panel" bind:this={panel}>
	<div class="head">
		<strong>🎓 Studia questo canto</strong>
		<button class="close" onclick={onclose} aria-label="Chiudi il percorso di studio">✕</button>
	</div>

	<div class="steps" role="tablist" aria-label="Passi dello studio">
		{#each STEPS as s (s.id)}
			<button
				class="step"
				class:on={step === s.id}
				role="tab"
				aria-selected={step === s.id}
				onclick={() => go(s.id)}
			>
				{s.label}
			</button>
		{/each}
	</div>

	{#if step === 'chords'}
		<p class="lead">
			{#if missing.length === 0}
				Gli accordi di questo canto li sai già tutti: ripassali una volta corda per corda, poi
				passa ai cambi.
			{:else}
				Questo canto chiede {chords.length}
				{chords.length === 1 ? 'accordo' : 'accordi'}, {missing.length} ancora da imparare. Aprili
				uno per uno: dentro c'è dove vanno le dita e la prova col microfono.
			{/if}
		</p>
		<div class="cards">
			{#each chords as chord, i (chord)}
				<ChordTutorialCard
					{chord}
					subtitle={known.includes(chord) ? 'già tuo' : 'da imparare'}
					open={i === 0 || (missing.length > 0 && chord === missing[0])}
					onLearned={() => onknown(chord)}
				/>
			{/each}
		</div>
		<div class="nav">
			<button class="next" onclick={() => go('changes')}>Avanti: i cambi →</button>
		</div>
	{:else if step === 'changes'}
		{#if changes.length === 0}
			<p class="lead">
				Questo canto sta su un accordo solo: non c'è nessun cambio da provare, vai al ritmo.
			</p>
		{:else}
			<p class="lead">
				I cambi che il canto chiede davvero, dal più frequente. Scegline uno e guarda quali dita
				restano ferme:
			</p>
			<div class="chips" role="group" aria-label="Cambi del canto">
				{#each changes as c, i (c.from + '>' + c.to)}
					<button
						class="chip"
						class:on={pair === i}
						aria-pressed={pair === i}
						onclick={() => (pair = i)}
					>
						{c.from} → {c.to}
						<span class="count">{c.count}×</span>
					</button>
				{/each}
			</div>
			{#if change}
				<ChordChange {chords} initialFrom={change.from} initialTo={change.to} />
			{/if}
		{/if}
		<p class="lead">
			Poi lo stesso cambio a tempo, lento: il metronomo suona l'accordo scelto e tu segui le
			pennate.
		</p>
		<StrumTrainer {chords} initialBpm={60} />
		<div class="nav">
			<button class="back" onclick={() => go('chords')}>← Accordi</button>
			<button class="next" onclick={() => go('play')}>Avanti: suona →</button>
		</div>
	{:else}
		<p class="lead">
			Ultimo passo: suonare il canto dall'inizio alla fine, anche piano. Il copilota tiene sotto
			gli occhi l'accordo che stai suonando e il prossimo, e la pagina inizia a scorrere da sola,
			così le mani restano sulla chitarra. La velocità si regola con i tasti − e + accanto a
			«Ferma».
		</p>
		<ul class="tips">
			<li>Se il cambio arriva in ritardo, rallenta il canto, non le dita.</li>
			<li>Alla prima passata canta e suona solo le pennate in giù, una per battito.</li>
			<li>Se un accordo ti blocca sempre nello stesso punto, torna al passo 1 su quello.</li>
		</ul>
		<div class="nav">
			<button class="back" onclick={() => go('changes')}>← Cambi</button>
			<button class="next" onclick={onplay}>▶ Suona col copilota</button>
		</div>
	{/if}
</div>

<style>
	.panel {
		border: 1px solid var(--control-border);
		border-radius: 12px;
		background: var(--surface);
		padding: 12px 14px 14px;
		margin: 10px 0 14px;
		font-size: 14px;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.head strong {
		font-size: 16px;
	}

	.close {
		margin-left: auto;
		font: inherit;
		font-size: 16px;
		background: none;
		border: none;
		color: var(--muted);
		padding: 2px 6px;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.steps {
		display: flex;
		gap: 6px;
		margin: 12px 0;
	}

	.step {
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		flex: 1 1 0;
		padding: 8px 6px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.step.on {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	.lead {
		margin: 10px 0;
	}

	.cards {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 12px;
	}

	.chip {
		font: inherit;
		font-size: 13px;
		padding: 6px 12px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.chip.on {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	.count {
		color: var(--muted);
		font-size: 12px;
	}

	.chip.on .count {
		color: inherit;
	}

	.tips {
		margin: 10px 0;
		padding-left: 20px;
	}

	.tips li {
		margin-bottom: 6px;
	}

	.nav {
		display: flex;
		gap: 8px;
		margin-top: 14px;
	}

	.back,
	.next {
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		padding: 9px 14px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.next {
		margin-left: auto;
	}

	.back:active,
	.next:active {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}
</style>
