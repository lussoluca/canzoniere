// Lookup of guitar chord diagrams from ChordPro's built-in definitions.
// chord-definitions.json is the guitar.json shipped inside the chordpro Docker
// image (ChordPro/res/config/guitar.json), the same data the PDF diagrams use.

import raw from './chord-definitions.json';

export interface ChordDef {
	base: number;
	frets: number[];
	fingers?: (number | string)[];
}

interface RawChord {
	name: string;
	base?: number;
	frets?: number[];
	fingers?: (number | string)[];
	copy?: string;
}

const byName = new Map<string, RawChord>();
for (const c of (raw as { chords: RawChord[] }).chords) byName.set(c.name, c);

// entries with `copy` inherit from another chord, optionally overriding fields
function resolve(name: string, depth = 0): ChordDef | null {
	const c = byName.get(name);
	if (!c || depth > 5) return null;
	if (c.copy) {
		const base = resolve(c.copy, depth + 1);
		if (!base) return null;
		return {
			base: c.base ?? base.base,
			frets: c.frets ?? base.frets,
			fingers: c.fingers ?? base.fingers
		};
	}
	if (!c.frets) return null;
	return { base: c.base ?? 1, frets: c.frets, fingers: c.fingers };
}

const LATIN_TO_EN: Record<string, string> = {
	Do: 'C',
	Re: 'D',
	Mi: 'E',
	Fa: 'F',
	Sol: 'G',
	La: 'A',
	Si: 'B'
};

// "Sol" must come before "Si" so that "Sol#" is not parsed as "Si"
const LATIN_PART_RE = /^(Do|Re|Mi|Fa|Sol|Si|La)([#b]?)(.*)$/;

/** "Sol" -> "G", "Lam" -> "Am", "Re/Fa#" -> "D/F#"; non-latin parts pass through ("Do6/9" -> "C6/9"). */
export function latinChordToEnglish(chord: string): string {
	return chord
		.split('/')
		.map((part) => {
			const m = part.match(LATIN_PART_RE);
			if (!m) return part;
			return LATIN_TO_EN[m[1]] + m[2] + m[3];
		})
		.join('/');
}

/**
 * Diagram definition for a latin chord name, or null when ChordPro has no
 * built-in diagram for it (in that case the PDF shows no diagram either).
 */
export function getChordDefinition(latinChord: string): ChordDef | null {
	return resolve(latinChordToEnglish(latinChord.trim()));
}
