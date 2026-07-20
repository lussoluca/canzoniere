// Ad-hoc songbook shared entirely through the URL: the chosen songs (and an
// optional title) are encoded into query parameters, so a link is all it takes
// to send a set to the group. No backend, works with the bundled songs.

import { findSong, type SongRef } from '$lib/data';

export function encodeCollection(songs: SongRef[]): string {
	return songs.map((s) => `${s.category}/${s.slug}`).join(',');
}

export function decodeCollection(param: string | null): SongRef[] {
	if (!param) return [];
	const out: SongRef[] = [];
	for (const key of param.split(',')) {
		const [category, ...rest] = key.split('/');
		const song = findSong(category, rest.join('/'));
		if (song) out.push(song); // skip entries whose song no longer exists
	}
	return out;
}
