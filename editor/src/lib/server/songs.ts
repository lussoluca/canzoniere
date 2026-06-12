import fs from 'node:fs/promises';
import path from 'node:path';
import { parse, serialize } from '$lib/chordpro';
import { CATEGORIES, categoryLabel } from '$lib/categories';

// Songs live in the repo's canzoni/ directory; override with SONGS_DIR (used by tests).
const SONGS_DIR = path.resolve(process.env.SONGS_DIR ?? path.join(process.cwd(), '..', 'canzoni'));

export interface SongListItem {
	category: string;
	file: string;
	title: string;
	artist: string;
}

export interface CategorySummary {
	category: string;
	count: number;
}

function safeJoin(...parts: string[]): string {
	const full = path.resolve(SONGS_DIR, ...parts);
	if (full !== SONGS_DIR && !full.startsWith(SONGS_DIR + path.sep)) {
		throw new Error('invalid path');
	}
	return full;
}

export async function listCategories(): Promise<string[]> {
	const entries = await fs.readdir(SONGS_DIR, { withFileTypes: true });
	return entries
		.filter((e) => e.isDirectory() && CATEGORIES.includes(e.name))
		.map((e) => e.name)
		.sort();
}

export async function listCategorySummaries(): Promise<CategorySummary[]> {
	const summaries: CategorySummary[] = [];
	for (const category of await listCategories()) {
		const files = (await fs.readdir(safeJoin(category))).filter((f) => f.endsWith('.cho'));
		summaries.push({ category, count: files.length });
	}
	return summaries;
}

export async function listSongsByCategory(category: string): Promise<SongListItem[]> {
	const dir = safeJoin(category);
	const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.cho'));
	const songs: SongListItem[] = [];
	for (const file of files) {
		const content = await fs.readFile(path.join(dir, file), 'utf-8');
		const { meta } = parse(content);
		songs.push({
			category,
			file,
			title: meta.title || file,
			artist: meta.artist
		});
	}
	songs.sort((a, b) => a.title.localeCompare(b.title, 'it'));
	return songs;
}

export async function listAllSongs(): Promise<SongListItem[]> {
	const songs: SongListItem[] = [];
	for (const category of await listCategories()) {
		songs.push(...(await listSongsByCategory(category)));
	}
	songs.sort((a, b) => a.title.localeCompare(b.title, 'it'));
	return songs;
}

export async function readSong(category: string, file: string): Promise<string> {
	return fs.readFile(safeJoin(category, file), 'utf-8');
}

export async function writeSong(category: string, file: string, content: string): Promise<void> {
	if (!file.endsWith('.cho')) throw new Error('file must end with .cho');
	await fs.writeFile(safeJoin(category, file), content, 'utf-8');
}

export async function moveSong(
	category: string,
	file: string,
	newCategory: string
): Promise<void> {
	const categories = await listCategories();
	if (!categories.includes(newCategory)) throw new Error('categoria non valida');
	if (newCategory === category) return;
	if (await songExists(newCategory, file)) {
		throw new Error(`${newCategory}/${file} esiste già`);
	}
	// the {tag:...} directive mirrors the category: rewrite it while moving
	const song = parse(await readSong(category, file));
	song.meta.tags = [categoryLabel(newCategory)];
	await writeSong(newCategory, file, serialize(song));
	await deleteSong(category, file);
}

export async function deleteSong(category: string, file: string): Promise<void> {
	await fs.unlink(safeJoin(category, file));
}

export async function songExists(category: string, file: string): Promise<boolean> {
	try {
		await fs.access(safeJoin(category, file));
		return true;
	} catch {
		return false;
	}
}
