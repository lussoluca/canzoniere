// Songs tagged for the moment being lived: {x_momento:...} (comma-separated
// values) and {x_energia:...} directives in the ChordPro source. The metadata
// is curated in the repository and reaches every device with the build.

import { parse } from '$songlib/chordpro';
import { allSongs, type SongRef } from '$lib/data';

export const CONTEXTS = [
	{
		id: 'fuoco',
		label: 'Fuoco o attività',
		moments: ['apertura', 'animazione', 'riflessione', 'chiusura']
	},
	{
		id: 'messa',
		label: 'Messa o celebrazione',
		moments: ['ingresso', 'offertorio', 'comunione', 'finale']
	}
] as const;

export const ENERGIES = ['calmo', 'medio', 'festoso'] as const;

export interface TaggedSong {
	song: SongRef;
	moments: string[];
	energy: string | null;
}

const RE_MOMENTO = /^\{\s*x_momento\s*:\s*(.*?)\s*\}$/i;
const RE_ENERGIA = /^\{\s*x_energia\s*:\s*(.*?)\s*\}$/i;

let cache: TaggedSong[] | null = null;

export function taggedSongs(): TaggedSong[] {
	if (cache) return cache;
	const out: TaggedSong[] = [];
	for (const song of allSongs) {
		const moments: string[] = [];
		let energy: string | null = null;
		for (const line of parse(song.source).lines) {
			if (line.type !== 'directive') continue;
			const m = line.raw.match(RE_MOMENTO);
			if (m) moments.push(...m[1].split(',').map((v) => v.trim().toLowerCase()).filter(Boolean));
			const e = line.raw.match(RE_ENERGIA);
			if (e) energy = e[1].trim().toLowerCase();
		}
		if (moments.length > 0 || energy) out.push({ song, moments, energy });
	}
	cache = out;
	return out;
}

/** Songs for the given moment, optionally filtered by energy. */
export function suggest(moment: string, energy: string | null): TaggedSong[] {
	return taggedSongs()
		.filter((t) => t.moments.includes(moment) && (energy === null || t.energy === energy))
		.sort((a, b) => a.song.title.localeCompare(b.song.title, 'it'));
}
