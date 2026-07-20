// Suggests the capo fret that makes a song's shapes easiest to play. Each
// candidate position transposes the shapes down and scores them with the same
// diagram data the PDF uses: barre chords and shapes up the neck cost more,
// chords without a known diagram cost the most.

import { transposeChord } from '$songlib/chords';
import { getChordDefinition } from '$songlib/diagrams';

function chordDifficulty(name: string): number {
	const def = getChordDefinition(name);
	if (!def) return 4;
	let score = def.base > 1 ? 1 : 0;
	if (def.fingers) {
		const perFinger = new Map<string, number>();
		def.fingers.forEach((f, i) => {
			if (!(def.frets[i] > 0)) return;
			const key = String(f);
			if (!/^[1-9A-Z]$/i.test(key)) return;
			perFinger.set(key, (perFinger.get(key) ?? 0) + 1);
		});
		for (const n of perFinger.values()) {
			if (n > 1) {
				score += 2; // barre
				break;
			}
		}
	}
	return score;
}

export interface CapoSuggestion {
	capo: number;
	shapes: string[]; // what the guitarist would read at that fret
	score: number;
}

/**
 * Evaluate capo 0..maxCapo for the given chords (the song's unique chords in
 * the key being sung, i.e. with the user's transpose applied but no capo).
 * Returns the best position, or null when no capo beats playing without one.
 */
export function suggestCapo(chords: string[], maxCapo = 7): CapoSuggestion | null {
	if (chords.length === 0) return null;
	let best: CapoSuggestion | null = null;
	let baseline = 0;
	for (let capo = 0; capo <= maxCapo; capo++) {
		const shapes = chords.map((c) => (capo === 0 ? c : transposeChord(c, -capo)));
		const score = shapes.reduce((sum, c) => sum + chordDifficulty(c), 0);
		if (capo === 0) baseline = score;
		if (best === null || score < best.score) best = { capo, shapes, score };
	}
	if (!best || best.capo === 0 || best.score >= baseline) return null;
	return best;
}
