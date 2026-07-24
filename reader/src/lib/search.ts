// Song search: a query mixes free text and #tag tokens ("#omelia te al").

import { normalizeTag } from '$songlib/tags';
import type { SongRef } from './data';

export interface ParsedQuery {
	tags: string[]; // #tokens, normalized and without the leading #
	text: string; // everything else, lowercased, matched against title/artist
}

export function parseQuery(query: string): ParsedQuery {
	const tags: string[] = [];
	const words: string[] = [];
	for (const token of query.trim().split(/\s+/)) {
		if (token === '') continue;
		if (token.startsWith('#')) {
			const tag = normalizeTag(token);
			if (tag !== '') tags.push(tag);
		} else {
			words.push(token);
		}
	}
	return { tags, text: words.join(' ').toLowerCase() };
}

export function matchesQuery(song: SongRef, q: ParsedQuery): boolean {
	// a partially typed tag already filters: "#ome" matches "omelia"
	for (const tag of q.tags) {
		if (!song.tags.some((t) => t.startsWith(tag))) return false;
	}
	if (q.text === '') return true;
	return song.title.toLowerCase().includes(q.text) || song.artist.toLowerCase().includes(q.text);
}
