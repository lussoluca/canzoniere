// Step-by-step Italian instructions for fretting a chord, derived from the
// same ChordPro definitions that draw the diagrams. Strings are numbered as
// on the guitar: 6ª = the lowest (thickest), 1ª = the highest (thinnest);
// ChordPro's frets array goes from the 6th string to the 1st.

import { getChordDefinition } from '$songlib/diagrams';

const STRING_SHORT = ['Mi basso', 'La', 'Re', 'Sol', 'Si', 'Mi cantino'];

function stringLabel(s: number): string {
	return `${6 - s}ª corda (${STRING_SHORT[s]})`;
}

const FINGERS: Record<string, string> = {
	'1': "l'indice (1)",
	'2': 'il medio (2)',
	'3': "l'anulare (3)",
	'4': 'il mignolo (4)',
	T: 'il pollice'
};

export interface ChordTutorial {
	steps: string[]; // one finger placement each, in playing order
	open: string[]; // strings played open
	muted: string[]; // strings that must not ring
	base: number; // first fret of the diagram window (> 1 for high positions)
}

export function chordTutorial(latinChord: string): ChordTutorial | null {
	const def = getChordDefinition(latinChord);
	if (!def) return null;

	// frets in the definition are relative to the diagram window
	const offset = def.base > 1 ? def.base - 1 : 0;
	const fretNo = (f: number) => f + offset;

	const fingerOf = (s: number): string | null => {
		const f = def.fingers?.[s];
		const key = f === undefined ? '' : String(f).toUpperCase();
		return /^[1-9A-Z]$/.test(key) ? key : null;
	};

	// barre: the same finger on more than one fretted string
	interface Barre {
		fret: number;
		from: number;
		to: number;
	}
	const barres = new Map<string, Barre>();
	def.frets.forEach((fret, s) => {
		if (!(fret > 0)) return;
		const key = fingerOf(s);
		if (!key) return;
		const b = barres.get(key);
		if (b) b.to = s;
		else barres.set(key, { fret, from: s, to: s });
	});
	for (const [key, b] of barres) if (b.from === b.to) barres.delete(key);

	const inBarre = (s: number): boolean => {
		const key = fingerOf(s);
		if (!key) return false;
		const b = barres.get(key);
		return b !== undefined && s >= b.from && s <= b.to;
	};

	const placements: { finger: string | null; s: number; fret: number }[] = [];
	def.frets.forEach((fret, s) => {
		if (fret > 0 && !inBarre(s)) placements.push({ finger: fingerOf(s), s, fret });
	});
	// place fingers in number order (index first), unnumbered ones last
	placements.sort(
		(a, b) => (a.finger ?? '9').localeCompare(b.finger ?? '9') || a.fret - b.fret || a.s - b.s
	);

	const steps: string[] = [];
	for (const [finger, b] of [...barres.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		steps.push(
			`Appoggia ${FINGERS[finger] ?? 'un dito'} disteso sulle corde dalla ${6 - b.from}ª alla ${6 - b.to}ª, al tasto ${fretNo(b.fret)}: è un barrè, tienilo ben schiacciato.`
		);
	}
	for (const p of placements) {
		const who = p.finger ? (FINGERS[p.finger] ?? `il dito ${p.finger}`) : 'un dito';
		steps.push(`Premi con ${who} la ${stringLabel(p.s)} al tasto ${fretNo(p.fret)}.`);
	}

	const open: string[] = [];
	const muted: string[] = [];
	def.frets.forEach((fret, s) => {
		if (fret === 0) open.push(stringLabel(s));
		else if (fret < 0) muted.push(stringLabel(s));
	});

	return { steps, open, muted, base: def.base };
}
