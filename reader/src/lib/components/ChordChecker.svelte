<script lang="ts">
	import { onDestroy } from 'svelte';
	import { PITCH_NAMES, chromaFromSpectrum, evaluateChroma, type ChromaVerdict } from '$lib/chroma';
	import { chordPitchClasses, micSupported, openMic, type MicSession } from '$lib/chord-listener';

	interface Props {
		chord: string;
	}

	let { chord }: Props = $props();

	const targets = $derived(chordPitchClasses(chord));

	type Phase = 'idle' | 'listening' | 'error';
	let phase = $state<Phase>('idle');
	let verdict = $state<ChromaVerdict | null>(null); // null while too quiet to judge
	let error = $state('');

	let session: MicSession | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;

	const RMS_GATE = 0.02; // below this the guitar isn't playing
	const TICK_MS = 90;
	const WINDOW = 8; // sliding window of frames (~0.7 s) the verdict is computed on
	const MIN_FRAMES = 3; // frames needed before the first verdict

	function stopAll() {
		clearInterval(timer);
		timer = undefined;
		session?.stop();
		session = null;
	}

	onDestroy(stopAll);

	function stop() {
		stopAll();
		phase = 'idle';
		verdict = null;
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
		phase = 'listening';

		const { analyser, sampleRate } = session;
		const time = new Float32Array(analyser.fftSize);
		const freq = new Float32Array(analyser.frequencyBinCount);
		const frames: Float32Array[] = [];

		timer = setInterval(() => {
			if (!session) return;
			analyser.getFloatTimeDomainData(time);
			let sum = 0;
			for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
			if (Math.sqrt(sum / time.length) < RMS_GATE) {
				// silence resets the window so the next strum starts clean
				frames.length = 0;
				verdict = null;
				return;
			}
			analyser.getFloatFrequencyData(freq);
			frames.push(chromaFromSpectrum(freq, sampleRate, analyser.fftSize));
			if (frames.length > WINDOW) frames.shift();
			if (frames.length < MIN_FRAMES) return;
			const acc = new Float32Array(12);
			for (const frame of frames) for (let i = 0; i < 12; i++) acc[i] += frame[i];
			verdict = evaluateChroma(acc, pcs);
		}, TICK_MS);
	}
</script>

{#if targets && micSupported()}
	<div class="checker" data-testid="chord-checker">
		{#if phase === 'listening'}
			<button class="listen" onclick={stop}>◼ Ferma</button>
		{:else}
			<button class="listen" onclick={start}>
				🎤 {phase === 'idle' ? 'Verifica con il microfono' : 'Riprova'}
			</button>
		{/if}
		{#if phase === 'listening'}
			<p class="result" aria-live="polite">
				{#if !verdict}
					<span class="hint">Suona l'accordo, ti ascolto…</span>
				{:else if verdict.ok}
					<span class="ok">Suona bene ✓</span>
				{:else}
					<span class="ko">
						Non ci siamo{#if verdict.missing.length > 0}{' · non sento: ' +
								verdict.missing.map((pc) => PITCH_NAMES[pc]).join(', ')}{/if}{#if verdict.extra.length > 0}{' · sento anche: ' +
								verdict.extra.map((pc) => PITCH_NAMES[pc]).join(', ')}{/if}
					</span>
				{/if}
			</p>
		{:else if phase === 'error'}
			<p class="result"><span class="ko">{error}</span></p>
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

	.result {
		flex: 1 1 220px;
		margin: 0;
		font-size: 14px;
		min-height: 1.4em;
	}

	.hint {
		color: var(--muted);
	}

	.ok {
		color: #2e7d32;
		font-weight: 600;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .ok {
			color: #81c784;
		}
	}

	:global(:root[data-theme='dark']) .ok {
		color: #81c784;
	}

	.ko {
		color: var(--muted);
	}
</style>
