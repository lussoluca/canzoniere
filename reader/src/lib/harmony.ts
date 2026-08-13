// Which note comes out of every string of a chord shape, and what that note is
// doing inside the chord. Everything is derived from the same ChordPro
// definitions that draw the diagrams, so the theory always matches the picture.
// Strings are indexed as in ChordPro's frets array: 0 = 6ª (Mi basso), 5 = 1ª
// (Mi cantino).

import { getChordDefinition } from '$songlib/diagrams';

const SCALE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const NOTE_SEMITONE: Record<string, number> = {
	Do: 0,
	Re: 2,
	Mi: 4,
	Fa: 5,
	Sol: 7,
	La: 9,
	Si: 11
};

// standard tuning, from the 6ª to the 1ª: Mi La Re Sol Si Mi
const OPEN_STRINGS = [4, 9, 2, 7, 11, 4];

/** Name of each string, from the 6ª to the 1ª. */
export const STRING_NAMES = ['Mi basso', 'La', 'Re', 'Sol', 'Si', 'Mi cantino'];

/** "6ª corda (Mi basso)" for the string at index `s` of the frets array. */
export function stringLabel(s: number): string {
	return `${6 - s}ª corda (${STRING_NAMES[s]})`;
}

/** The note the string at index `s` gives when pressed at `fret` (0 = open). */
export function noteAt(s: number, fret: number): string {
	return SCALE[(OPEN_STRINGS[s] + fret) % 12];
}

// "Sol" must come before "Si" so that "Sol#" is not parsed as "Si"
const LATIN_NOTE_RE = /^(Do|Re|Mi|Fa|Sol|Si|La)([#b]?)/;

/** Semitone of the note that names the chord, or null when unparseable. */
export function rootSemitone(latinChord: string): number | null {
	const m = latinChord.trim().match(LATIN_NOTE_RE);
	if (!m) return null;
	const flat = m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0;
	return (((NOTE_SEMITONE[m[1]] + flat) % 12) + 12) % 12;
}

// What each distance from the root is called. The short form goes in the
// diagram table, the long one in the explanations.
const ROLES: { short: string; long: string }[] = [
	{ short: '1', long: 'fondamentale' },
	{ short: '9♭', long: 'nona minore' },
	{ short: '9', long: 'nona' },
	{ short: '3m', long: 'terza minore' },
	{ short: '3', long: 'terza maggiore' },
	{ short: '4', long: 'quarta' },
	{ short: '5♭', long: 'quinta diminuita' },
	{ short: '5', long: 'quinta' },
	{ short: '5♯', long: 'quinta aumentata' },
	{ short: '6', long: 'sesta' },
	{ short: '7', long: 'settima' },
	{ short: '7+', long: 'settima maggiore' }
];

export interface StringNote {
	string: number; // index in the frets array: 0 = 6ª, 5 = 1ª
	fret: number; // -1 muted, 0 open, otherwise the fret to press
	note: string | null; // null on a muted string
	interval: number | null; // semitones above the root
	role: string | null; // "fondamentale", "terza minore", …
	roleShort: string | null; // "1", "3m", …
}

export interface Voicing {
	chord: string; // latin name, e.g. "Lam7"
	strings: StringNote[]; // from the 6ª to the 1ª
}

/**
 * The sounding notes of a chord shape, one entry per string. Returns null when
 * ChordPro has no diagram for the chord or the name has no readable root.
 */
export function chordVoicing(latinChord: string): Voicing | null {
	const def = getChordDefinition(latinChord);
	const root = rootSemitone(latinChord);
	if (!def || root === null) return null;

	const strings = def.frets.map((fret, s) => {
		// above the first position the diagram window starts at def.base
		const at = fret > 0 && def.base > 1 ? fret + def.base - 1 : fret;
		if (at < 0) {
			return { string: s, fret: -1, note: null, interval: null, role: null, roleShort: null };
		}
		const semitone = (OPEN_STRINGS[s] + at) % 12;
		const interval = (((semitone - root) % 12) + 12) % 12;
		return {
			string: s,
			fret: at,
			note: SCALE[semitone],
			interval,
			role: ROLES[interval].long,
			roleShort: ROLES[interval].short
		};
	});

	return { chord: latinChord, strings };
}

export interface ChordNote {
	note: string;
	interval: number;
	role: string;
	roleShort: string;
}

/** The distinct notes of a voicing, from the fondamentale upwards. */
export function chordNotes(voicing: Voicing): ChordNote[] {
	const seen = new Map<number, ChordNote>();
	for (const s of voicing.strings) {
		if (s.note === null || s.interval === null) continue;
		if (!seen.has(s.interval)) {
			seen.set(s.interval, {
				note: s.note,
				interval: s.interval,
				role: s.role as string,
				roleShort: s.roleShort as string
			});
		}
	}
	return [...seen.values()].sort((a, b) => a.interval - b.interval);
}

export interface VoicingChange {
	string: number;
	from: StringNote;
	to: StringNote;
}

/** The strings whose fret differs between two shapes of the same root. */
export function voicingDiff(from: Voicing, to: Voicing): VoicingChange[] {
	const out: VoicingChange[] = [];
	for (let s = 0; s < from.strings.length; s++) {
		const a = from.strings[s];
		const b = to.strings[s];
		if (a.fret !== b.fret) out.push({ string: s, from: a, to: b });
	}
	return out;
}

function fretPhrase(s: StringNote): string {
	if (s.fret < 0) return 'resta muta';
	if (s.fret === 0) return `suona il ${s.note} a vuoto`;
	return `suona il ${s.note} al ${s.fret}º tasto`;
}

/** One sentence per changed string, explaining the move and what it adds. */
export function changeSentence(change: VoicingChange, toChord: string): string {
	const { from, to } = change;
	const head = `Sulla ${stringLabel(change.string)}`;
	if (to.fret < 0) return `${head} togli il dito e non suoni più la corda.`;
	const move =
		from.fret < 0
			? `entra nell'accordo e ${fretPhrase(to)}`
			: to.fret === 0
				? `alzi il dito dal ${from.fret}º tasto e la corda dà il ${to.note} a vuoto`
				: from.fret === 0
					? `appoggi un dito al ${to.fret}º tasto e la corda dà il ${to.note}`
					: `sposti il dito dal ${from.fret}º al ${to.fret}º tasto e la corda dà il ${to.note}`;
	const tail =
		to.role === from.role
			? `, sempre la ${to.role}`
			: from.role === null
				? `, che è la ${to.role} di ${toChord}`
				: `, che è la ${to.role} di ${toChord} al posto della ${from.role}`;
	return `${head} ${move}${tail}.`;
}
