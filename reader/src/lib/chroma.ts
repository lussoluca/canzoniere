// Pure DSP helpers for the microphone chord check: fold an FFT spectrum into
// a 12-bin chromagram and score it against a chord's pitch classes. No audio
// or DOM APIs here, so the math is testable in isolation.

export const PITCH_NAMES = [
	'Do',
	'Do#',
	'Re',
	'Re#',
	'Mi',
	'Fa',
	'Fa#',
	'Sol',
	'Sol#',
	'La',
	'La#',
	'Si'
];

// analysis band: from just under the guitar's low Mi (82 Hz) up to where the
// spectrum is mostly harmonics of the fretted notes
const F_MIN = 70;
const F_MAX = 1200;

const C4 = 261.626;

/**
 * Chromagram of one spectrum frame. `db` is what AnalyserNode's
 * getFloatFrequencyData returns (power in dB per bin).
 */
export function chromaFromSpectrum(
	db: Float32Array,
	sampleRate: number,
	fftSize: number
): Float32Array {
	const chroma = new Float32Array(12);
	const binHz = sampleRate / fftSize;
	const lo = Math.max(1, Math.ceil(F_MIN / binHz));
	const hi = Math.min(db.length - 1, Math.floor(F_MAX / binHz));
	for (let i = lo; i <= hi; i++) {
		if (!Number.isFinite(db[i])) continue;
		const power = 10 ** (db[i] / 10);
		const pc = ((Math.round(12 * Math.log2((i * binHz) / C4)) % 12) + 12) % 12;
		chroma[pc] += power;
	}
	return chroma;
}

export interface ChromaVerdict {
	ok: boolean;
	score: number; // 0..1: energy share held by the chord's pitch classes
	missing: number[]; // chord pitch classes that are too weak
	extra: number[]; // loud pitch classes outside the chord
}

// an "ok" needs most of the energy on the chord's notes and none of them
// absent; a real guitar spreads energy on harmonics outside the chord (the
// 3rd harmonic of Re lands on La), so these are looser than the ideal case
const OK_SCORE = 0.6;
// a chord note is missing when it holds less than this slice of its fair share
const MISSING_RATIO = 0.12;
// a foreign note is reported when it holds more than this share of the total
const EXTRA_SHARE = 0.22;

export function evaluateChroma(chroma: Float32Array, chordPcs: number[]): ChromaVerdict {
	let total = 0;
	for (let pc = 0; pc < 12; pc++) total += chroma[pc];
	if (total <= 0) return { ok: false, score: 0, missing: [...chordPcs], extra: [] };

	const inChord = new Set(chordPcs);
	let score = 0;
	for (const pc of chordPcs) score += chroma[pc] / total;

	const fair = 1 / chordPcs.length;
	const missing = chordPcs.filter((pc) => chroma[pc] / total < MISSING_RATIO * fair);
	const extra: number[] = [];
	for (let pc = 0; pc < 12; pc++) {
		if (!inChord.has(pc) && chroma[pc] / total > EXTRA_SHARE) extra.push(pc);
	}

	const ok = score >= OK_SCORE && missing.length === 0 && extra.length === 0;
	return { ok, score, missing, extra };
}
