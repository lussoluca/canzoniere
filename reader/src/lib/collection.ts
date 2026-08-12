// Ad-hoc songbook shared entirely through the URL: the chosen songs (and an
// optional title) are encoded into query parameters, so a link is all it takes
// to send a set to the group. No backend, works with the bundled songs.

import { findSong, type SongRef } from '$lib/data';
import { SCROLL_MIN, SCROLL_MAX, type SongPrefs } from '$lib/prefs';

// A shared song can carry the sender's reading prefs, so the whole group sees
// the set with the same key, simplified chords and scroll speed.
export interface CollectionSong extends SongRef {
	prefs?: Partial<SongPrefs>;
}

// Prefs travel as a compact suffix after "~": t<n> transpose, s simplified
// chords, h hide chords, v<n> scroll speed, always in this order
// (e.g. "chiesa/tu_sei~t-2sv5"). Entries without prefs have no suffix, so
// links from before this format stayed valid.
export function encodePrefs(prefs: Partial<SongPrefs>): string {
	let out = '';
	if (prefs.transpose) out += `t${prefs.transpose}`;
	if (prefs.simplify) out += 's';
	if (prefs.hideChords) out += 'h';
	if (prefs.scrollSpeed !== undefined) out += `v${prefs.scrollSpeed}`;
	return out;
}

const PREFS_RE = /^(?:t(-?\d+))?(s)?(h)?(?:v(\d+))?$/;

export function decodePrefs(raw: string): Partial<SongPrefs> | undefined {
	const m = PREFS_RE.exec(raw);
	if (!m || raw === '') return undefined;
	const out: Partial<SongPrefs> = {};
	// same [-6, +5] window the transpose control uses
	if (m[1]) out.transpose = ((parseInt(m[1], 10) % 12) + 18) % 12 - 6;
	if (m[2]) out.simplify = true;
	if (m[3]) out.hideChords = true;
	if (m[4]) {
		out.scrollSpeed = Math.min(SCROLL_MAX, Math.max(SCROLL_MIN, parseInt(m[4], 10)));
	}
	return out;
}

export function encodeCollection(songs: CollectionSong[]): string {
	return songs
		.map((s) => {
			const suffix = s.prefs ? encodePrefs(s.prefs) : '';
			return `${s.category}/${s.slug}${suffix ? `~${suffix}` : ''}`;
		})
		.join(',');
}

export function decodeCollection(param: string | null): CollectionSong[] {
	if (!param) return [];
	const out: CollectionSong[] = [];
	for (const key of param.split(',')) {
		const [path, rawPrefs] = key.split('~');
		const [category, ...rest] = path.split('/');
		const song = findSong(category, rest.join('/'));
		if (!song) continue; // skip entries whose song no longer exists
		const prefs = rawPrefs ? decodePrefs(rawPrefs) : undefined;
		out.push(prefs ? { ...song, prefs } : song);
	}
	return out;
}
