// The chords the reader's owner can play, kept in localStorage. Songs are
// classified against this set (matching on simplified base triads) into
// "playable now", "one chord away" and "later".

import { simplifyChord, englishChordToLatin } from '$songlib/chords';
import { allSongs, type SongRef } from '$lib/data';
import { parse } from '$songlib/chordpro';

const KEY = 'reader:known-chords';

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
	cache = allSongs.map((song) => {
		const seen = new Set<string>();
		for (const line of parse(song.source).lines) {
			if (line.type !== 'lyric') continue;
			// English names are normalized to latin so "Am" and "Lam" match.
			for (const c of line.chords) seen.add(englishChordToLatin(simplifyChord(c.chord)));
		}
		return { song, chords: [...seen].sort() };
	});
	return cache;
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
