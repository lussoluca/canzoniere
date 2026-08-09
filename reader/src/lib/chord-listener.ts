// Microphone capture for the chord check, plus the mapping from a chord's
// diagram to the pitch classes it should produce. The audio never leaves the
// device: analysis happens in the browser via an AnalyserNode.

import { getChordDefinition } from '$songlib/diagrams';

// standard tuning: MIDI note of each open string, from the 6th to the 1st
const TUNING = [40, 45, 50, 55, 59, 64];

/** Pitch classes (0 = Do) the chord's diagram produces, or null without a diagram. */
export function chordPitchClasses(latinChord: string): number[] | null {
	const def = getChordDefinition(latinChord);
	if (!def) return null;
	const offset = def.base > 1 ? def.base - 1 : 0;
	const pcs = new Set<number>();
	def.frets.forEach((fret, s) => {
		if (fret < 0) return; // muted string
		const midi = TUNING[s] + (fret > 0 ? fret + offset : 0);
		pcs.add(midi % 12);
	});
	return [...pcs].sort((a, b) => a - b);
}

export interface MicSession {
	analyser: AnalyserNode;
	sampleRate: number;
	stop: () => void;
}

export function micSupported(): boolean {
	return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

/**
 * Open the microphone and return an analyser fed by it. Voice processing is
 * disabled: echo cancellation and noise suppression eat the guitar's signal.
 */
export async function openMic(): Promise<MicSession> {
	const stream = await navigator.mediaDevices.getUserMedia({
		audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
	});
	const ctx = new AudioContext();
	// Safari/iOS can hand out a suspended context even inside a user gesture
	if (ctx.state === 'suspended') await ctx.resume();
	const analyser = ctx.createAnalyser();
	analyser.fftSize = 8192; // ~5 Hz per bin at 44.1 kHz: enough to separate the low strings
	analyser.smoothingTimeConstant = 0.5;
	ctx.createMediaStreamSource(stream).connect(analyser);
	return {
		analyser,
		sampleRate: ctx.sampleRate,
		stop: () => {
			for (const track of stream.getTracks()) track.stop();
			void ctx.close();
		}
	};
}
