// Chord helpers: english -> latin conversion and transposition (latin notes).

const LATIN_SCALE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const NOTE_SEMITONE: Record<string, number> = {
	Do: 0,
	Re: 2,
	Mi: 4,
	Fa: 5,
	Sol: 7,
	La: 9,
	Si: 11
};

const EN_TO_LATIN: Record<string, string> = {
	A: 'La',
	B: 'Si',
	C: 'Do',
	D: 'Re',
	E: 'Mi',
	F: 'Fa',
	G: 'Sol'
};

// "Sol" must come before "Si" so that "Sol#" is not parsed as "Si"
const LATIN_NOTE_RE = /^(Do|Re|Mi|Fa|Sol|Si|La)([#b]?)(.*)$/;
const ENGLISH_NOTE_RE = /^([A-G])([#b]?)(.*)$/;

/** Convert english chord names (Am, C7, F#m, G/B) to latin (Lam, Do7, Fa#m, Sol/Si). */
export function englishChordToLatin(chord: string): string {
	return chord
		.split('/')
		.map((part) => {
			if (LATIN_NOTE_RE.test(part)) return part; // already latin
			const m = part.match(ENGLISH_NOTE_RE);
			if (!m) return part;
			return EN_TO_LATIN[m[1]] + m[2] + m[3];
		})
		.join('/');
}

/** Transpose a latin chord by `delta` semitones; accidentals are normalized to sharps. */
export function transposeChord(chord: string, delta: number): string {
	return chord
		.split('/')
		.map((part) => {
			const m = part.match(LATIN_NOTE_RE);
			if (!m) return part;
			const flat = m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0;
			const semitone = (((NOTE_SEMITONE[m[1]] + flat + delta) % 12) + 12) % 12;
			return LATIN_SCALE[semitone] + m[3];
		})
		.join('/');
}
