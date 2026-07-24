// Song database, bundled at build time: every .cho file under canzoni/ and
// every songbook .txt under canzonieri/ is inlined into the app bundle, so the
// reader needs no backend and works offline.

import { parse } from '$songlib/chordpro';
import { categoryLabel, sortCategories } from '$songlib/categories';
import categoryOrder from '../../../canzoni/.categories.json';

const rawSongs = import.meta.glob('../../../canzoni/*/*.cho', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const rawBooks = import.meta.glob('../../../canzonieri/*.txt', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

export interface SongRef {
	category: string;
	slug: string; // filename without .cho, used in URLs
	file: string;
	title: string;
	artist: string;
	tags: string[]; // free-form search tags ({x_tag:...})
	source: string; // raw ChordPro
}

export interface CategorySummary {
	name: string;
	label: string;
	count: number;
}

export interface Songbook {
	name: string;
	label: string;
	songs: SongRef[];
	missing: string[]; // entries whose .cho file no longer exists
}

function buildSongs(): SongRef[] {
	const songs = Object.entries(rawSongs).map(([path, source]) => {
		const parts = path.split('/');
		const file = parts[parts.length - 1];
		const category = parts[parts.length - 2];
		const slug = file.replace(/\.cho$/, '');
		const { meta } = parse(source);
		return {
			category,
			slug,
			file,
			title: meta.title || slug,
			artist: meta.artist,
			tags: meta.labels,
			source
		};
	});
	songs.sort((a, b) => a.title.localeCompare(b.title, 'it'));
	return songs;
}

export const allSongs: SongRef[] = buildSongs();

// every tag in use, for the #tag suggestions in the search boxes
export const allTags: string[] = [...new Set(allSongs.flatMap((s) => s.tags))].sort((a, b) =>
	a.localeCompare(b, 'it')
);

const byPath = new Map(allSongs.map((s) => [`${s.category}/${s.file}`, s]));

export const categories: CategorySummary[] = (() => {
	const counts = new Map<string, number>();
	for (const s of allSongs) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
	const known = (categoryOrder as string[]).filter((c) => counts.has(c));
	const extra = sortCategories([...counts.keys()].filter((c) => !known.includes(c)));
	return [...known, ...extra].map((name) => ({
		name,
		label: categoryLabel(name),
		count: counts.get(name) ?? 0
	}));
})();

export function songsByCategory(category: string): SongRef[] {
	return allSongs.filter((s) => s.category === category);
}

export function findSong(category: string, slug: string): SongRef | undefined {
	return byPath.get(`${category}/${slug}.cho`);
}

export const songbooks: Songbook[] = Object.entries(rawBooks)
	.map(([path, content]) => {
		const name = path.split('/').pop()!.replace(/\.txt$/, '');
		const entries = content
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter((l) => l !== '' && !l.startsWith('#'));
		const songs: SongRef[] = [];
		const missing: string[] = [];
		for (const entry of entries) {
			const song = byPath.get(entry);
			if (song) songs.push(song);
			else missing.push(entry);
		}
		return { name, label: categoryLabel(name), songs, missing };
	})
	.sort((a, b) => a.name.localeCompare(b.name, 'it'));

export function findSongbook(name: string): Songbook | undefined {
	return songbooks.find((b) => b.name === name);
}
