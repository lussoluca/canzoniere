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

// case-insensitive lookups for sanitization
const LATIN_NOTE_CANON: Record<string, string> = {
	do: 'Do',
	re: 'Re',
	mi: 'Mi',
	fa: 'Fa',
	sol: 'Sol',
	la: 'La',
	si: 'Si'
};
const EN_NOTE_CANON: Record<string, string> = {
	a: 'La',
	b: 'Si',
	c: 'Do',
	d: 'Re',
	e: 'Mi',
	f: 'Fa',
	g: 'Sol'
};
// "sol" before "si" so "sol#" is not parsed as "si"
const LATIN_NOTE_CI_RE = /^(do|re|mi|fa|sol|si|la)([#b]?)(.*)$/i;
const ENGLISH_NOTE_CI_RE = /^([a-g])([#b]?)(.*)$/i;

// minor marker is lowercase "m" in latin notation; an all-caps input like "LAM"
// yields suffix "M" which must become "m" (Lam, not LaM)
function normalizeSuffix(suffix: string): string {
	return suffix.replace(/^M/, 'm');
}

/**
 * Normalize a chord typed in the visual editor into the latin format ChordPro
 * expects (e.g. "g" -> "Sol", "em" -> "Mim", "D/f#" -> "Re/Fa#").
 * English note names are converted to latin and note case is fixed; the suffix
 * (m, 7, maj7, sus4, …) is preserved verbatim. Unparseable parts are returned
 * trimmed but otherwise unchanged.
 */
export function sanitizeChord(chord: string): string {
	return chord
		.trim()
		.split('/')
		.map((raw) => {
			const part = raw.trim();
			if (part === '') return part;
			const latin = part.match(LATIN_NOTE_CI_RE);
			if (latin) return LATIN_NOTE_CANON[latin[1].toLowerCase()] + latin[2] + normalizeSuffix(latin[3]);
			const en = part.match(ENGLISH_NOTE_CI_RE);
			if (en) return EN_NOTE_CANON[en[1].toLowerCase()] + en[2] + normalizeSuffix(en[3]);
			return part;
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
