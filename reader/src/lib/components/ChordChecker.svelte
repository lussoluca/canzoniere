<script lang="ts" module>
	// one microphone at a time: starting a checker stops the one still listening
	let stopActive: (() => void) | null = null;
</script>

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
	let level = $state(0); // smoothed input level, drives the little meter
	let mute = $state(false); // no signal at all from the microphone

	let session: MicSession | null = null;
	let timer: ReturnType<typeof setInterval> | undefined;

	const RMS_GATE = 0.006; // below this the guitar isn't playing (phone mics are quiet)
	const RMS_SILENCE = 0.0005; // below this the stream is effectively dead
	const TICK_MS = 90;
	const WINDOW = 8; // sliding window of frames (~0.7 s) the verdict is computed on
	const MIN_FRAMES = 3; // frames needed before the first verdict
	const MUTE_TICKS = 40; // ~3.6 s of dead stream before warning about it

	function stopAll() {
		clearInterval(timer);
		timer = undefined;
		session?.stop();
		session = null;
	}

	function stop() {
		stopAll();
		phase = 'idle';
		verdict = null;
		level = 0;
		mute = false;
		if (stopActive === stop) stopActive = null;
	}

	onDestroy(stop);

	async function start() {
		const pcs = targets;
		if (!pcs) return;
		stopActive?.();
		stopActive = stop;
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
		let deadTicks = 0;

		timer = setInterval(() => {
			if (!session) return;
			analyser.getFloatTimeDomainData(time);
			let sum = 0;
			for (let i = 0; i < time.length; i++) sum += time[i] * time[i];
			const rms = Math.sqrt(sum / time.length);
			level = Math.max(rms, level * 0.8);

			// a stream that stays flat isn't ambient silence, it's no input at all
			deadTicks = rms < RMS_SILENCE ? deadTicks + 1 : 0;
			mute = deadTicks >= MUTE_TICKS;

			if (rms < RMS_GATE) {
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
			<div class="meter" aria-hidden="true">
				<div class="meter-fill" style="width: {Math.min(100, level * 900)}%"></div>
			</div>
			<p class="result" aria-live="polite">
				{#if mute}
					<span class="hint">
						Non arriva segnale dal microfono: controlla che non sia coperto o usato da un'altra
						app.
					</span>
				{:else if !verdict}
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

	.meter {
		flex: 0 0 64px;
		height: 6px;
		border-radius: 3px;
		background: var(--control-border);
		overflow: hidden;
	}

	.meter-fill {
		height: 100%;
		border-radius: 3px;
		background: var(--active-bg);
		transition: width 90ms linear;
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
