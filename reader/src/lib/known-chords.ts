// The chords the reader's owner can play, kept in localStorage. Songs are
// classified against this set (matching on simplified base triads) into
// "playable now", "one chord away" and "later".

import { simplifyChord, englishChordToLatin, transposeChord } from '$songlib/chords';
import { allSongs, type SongRef } from '$lib/data';
import { parse } from '$songlib/chordpro';

const KEY = 'reader:known-chords';

// The form chords are compared in: the base triad, in latin names, so that
// "Am", "Lam7" and "Lam" all count as the same chord to know.
export function baseChord(chord: string): string {
	return englishChordToLatin(simplifyChord(chord));
}

export function loadKnownChords(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		return Array.isArray(list) ? list.filter((c) => typeof c === 'string') : [];
	} catch {
		return [];
	}
}

export function saveKnownChords(list: string[]): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (list.length === 0) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		// storage full or unavailable: the selection just isn't kept
	}
}

export interface SongChords {
	song: SongRef;
	chords: string[]; // unique simplified base triads used by the song
}

// Chord usage is computed once per session over the bundled songs.
let cache: SongChords[] | null = null;

export function songsWithChords(): SongChords[] {
	if (cache) return cache;
	cache = allSongs.map((song) => ({ song, chords: chordsOf(song.source) }));
	return cache;
}

/** The base triads one ChordPro source uses, sorted. */
export function chordsOf(source: string): string[] {
	const seen = new Set<string>();
	for (const line of parse(source).lines) {
		if (line.type !== 'lyric') continue;
		for (const c of line.chords) seen.add(baseChord(c.chord));
	}
	return [...seen].sort();
}

/** Every base triad used in the repertoire, with the number of songs using it. */
export function chordUsage(): { chord: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const { chords } of songsWithChords()) {
		for (const c of chords) counts.set(c, (counts.get(c) ?? 0) + 1);
	}
	return [...counts.entries()]
		.map(([chord, count]) => ({ chord, count }))
		.sort((a, b) => b.count - a.count || a.chord.localeCompare(b.chord));
}

export interface Classification {
	playable: SongChords[];
	almost: { entry: SongChords; missing: string }[]; // exactly one chord missing
	later: SongChords[];
	// "learn X and unlock N songs", best first
	unlocks: { chord: string; count: number }[];
}

export function classify(known: string[]): Classification {
	const set = new Set(known);
	const playable: SongChords[] = [];
	const almost: { entry: SongChords; missing: string }[] = [];
	const later: SongChords[] = [];
	const unlockCounts = new Map<string, number>();

	for (const entry of songsWithChords()) {
		if (entry.chords.length === 0) {
			later.push(entry); // songs without chords are not "playable" wins
			continue;
		}
		const missing = entry.chords.filter((c) => !set.has(c));
		if (missing.length === 0) playable.push(entry);
		else if (missing.length === 1) {
			almost.push({ entry, missing: missing[0] });
			unlockCounts.set(missing[0], (unlockCounts.get(missing[0]) ?? 0) + 1);
		} else later.push(entry);
	}

	const unlocks = [...unlockCounts.entries()]
		.map(([chord, count]) => ({ chord, count }))
		.sort((a, b) => b.count - a.count || a.chord.localeCompare(b.chord));

	return { playable, almost, later, unlocks };
}

export interface Readiness {
	chords: string[]; // the base triads of the song, first appearance order kept by the caller
	known: string[];
	missing: string[];
	// A shift, relative to what the reader is seeing now, that leaves only
	// chords they already know; null when no shift within an octave does.
	transpose: number | null;
}

// How ready the reader is for one song. The chords come in as the reader sees
// them (already transposed and simplified by their prefs), so the suggested
// shift is relative to the current view.
export function readiness(displayChords: string[], knownList: string[]): Readiness {
	const set = new Set(knownList);
	const chords = [...new Set(displayChords.map(baseChord))];
	const known = chords.filter((c) => set.has(c));
	const missing = chords.filter((c) => !set.has(c));

	let transpose: number | null = null;
	if (missing.length > 0) {
		// nearest shift first: a semitone up reads better than five down
		for (const d of [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6]) {
			if (chords.every((c) => set.has(baseChord(transposeChord(c, d))))) {
				transpose = d;
				break;
			}
		}
	}

	return { chords, known, missing, transpose };
}

// The chord changes a song actually asks for, most frequent first. The names
// pass through `map` first, so the caller can show them transposed as the
// reader sees them.
export function chordChanges(
	source: string,
	map: (chord: string) => string = (c) => c
): { from: string; to: string; count: number }[] {
	const counts = new Map<string, number>();
	let prev: string | null = null;
	for (const line of parse(source).lines) {
		if (line.type !== 'lyric') continue;
		for (const c of [...line.chords].sort((a, b) => a.pos - b.pos)) {
			const chord = baseChord(map(c.chord));
			if (prev && prev !== chord) {
				const pair = `${prev}>${chord}`;
				counts.set(pair, (counts.get(pair) ?? 0) + 1);
			}
			prev = chord;
		}
	}
	return [...counts.entries()]
		.map(([pair, count]) => {
			const [from, to] = pair.split('>');
			return { from, to, count };
		})
		.sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
}
