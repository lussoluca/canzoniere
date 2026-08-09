<script lang="ts">
	import { onDestroy } from 'svelte';
	import { PITCH_NAMES, chromaFromSpectrum, evaluateChroma, type ChromaVerdict } from '$lib/chroma';
	import { chordPitchClasses, micSupported, openMic, type MicSession } from '$lib/chord-listener';

	interface Props {
		chord: string;
	}

	let { chord }: Props = $props();

	const targets = $derived(chordPitchClasses(chord));

	type Phase = 'idle' | 'waiting' | 'capturing' | 'done' | 'error';
	let phase = $state<Phase>('idle');
	let verdict = $state<ChromaVerdict | null>(null);
	let error = $state('');

	let session: MicSession | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;

	const RMS_GATE = 0.02; // strum detection threshold on the time-domain signal
	const CAPTURE_MS = 900; // how long the chord is averaged once the strum is heard
	const TICK_MS = 90;

	function stopAll() {
		clearInterval(timer);
		timer = undefined;
		session?.stop();
		session = null;
	}

	onDestroy(stopAll);

	function cancel() {
		stopAll();
		phase = 'idle';
	}

	async function start() {
		const pcs = targets;
		if (!pcs) return;
		verdict = null;
		error = '';
		try {
			session = await openMic();
		} catch (e) {
			phase = 'error';
			error =
				e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
					? "Permesso negato: consenti l'uso del microfono e riprova."
					: 'Il microfono non è disponibile su questo dispositivo.';
			return;
		}
		phase = 'waiting';

		const { analyser, sampleRate } = session;
		const time = new Float32Array(analyser.fftSize);
		const freq = new Float32Array(analyser.frequencyBinCount);
		const acc = new Float32Array(12);
		let capturedMs = 0;

		timer = setInterval(() => {
			if (!session) return;
			if (phase === 'waiting') {
				analyser.getFloatTimeDomainData(time);
				let sum = 0;
				for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
				if (Math.sqrt(sum / time.length) < RMS_GATE) return;
				phase = 'capturing';
			}
			analyser.getFloatFrequencyData(freq);
			const frame = chromaFromSpectrum(freq, sampleRate, analyser.fftSize);
			for (let i = 0; i < 12; i++) acc[i] += frame[i];
			capturedMs += TICK_MS;
			if (capturedMs >= CAPTURE_MS) {
				stopAll();
				verdict = evaluateChroma(acc, pcs);
				phase = 'done';
			}
		}, TICK_MS);
	}
</script>

{#if targets && micSupported()}
	<div class="checker" data-testid="chord-checker">
		{#if phase === 'waiting' || phase === 'capturing'}
			<button class="listen" onclick={cancel}>◼ Annulla</button>
			<span class="hint" aria-live="polite">
				{phase === 'waiting' ? "Suona l'accordo…" : 'Ti ascolto…'}
			</span>
		{:else}
			<button class="listen" onclick={start}>
				🎤 {phase === 'idle' ? 'Verifica con il microfono' : 'Riprova'}
			</button>
		{/if}
		{#if phase === 'done' && verdict}
			{#if verdict.ok}
				<p class="result ok" aria-live="polite">Suona bene ✓</p>
			{:else}
				<p class="result ko" aria-live="polite">
					Non ci siamo ancora.
					{#if verdict.missing.length > 0}
						Non sento: {verdict.missing.map((pc) => PITCH_NAMES[pc]).join(', ')}.
					{/if}
					{#if verdict.extra.length > 0}
						Sento anche note fuori dall'accordo: {verdict.extra
							.map((pc) => PITCH_NAMES[pc])
							.join(', ')}.
					{/if}
					Riguarda i passi qui sopra e riprova.
				</p>
			{/if}
		{:else if phase === 'error'}
			<p class="result ko">{error}</p>
		{/if}
	</div>
{/if}

<style>
	.checker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-top: 10px;
	}

	.listen {
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		padding: 8px 14px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.hint {
		font-size: 14px;
		color: var(--muted);
	}

	.result {
		flex-basis: 100%;
		margin: 0;
		font-size: 14px;
	}

	.result.ok {
		color: #2e7d32;
		font-weight: 500;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .result.ok {
			color: #81c784;
		}
	}

	:global(:root[data-theme='dark']) .result.ok {
		color: #81c784;
	}

	.result.ko {
		color: var(--muted);
	}
</style>
