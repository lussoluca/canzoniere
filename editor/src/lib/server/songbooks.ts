import fs from 'node:fs/promises';
import path from 'node:path';

// Event songbooks live in the repo's canzonieri/ directory as .txt files:
// one song per line, as a path relative to canzoni/ (e.g. "chiesa/tu_sei.cho").
const SONGBOOKS_DIR = path.resolve(
	process.env.SONGBOOKS_DIR ?? path.join(process.cwd(), '..', 'canzonieri')
);

const NAME_RE = /^[\w-]+$/;

export interface SongbookListItem {
	name: string;
	count: number;
}

function fileFor(name: string): string {
	if (!NAME_RE.test(name)) throw new Error('nome non valido');
	return path.join(SONGBOOKS_DIR, name + '.txt');
}

export async function listSongbooks(): Promise<SongbookListItem[]> {
	const files = (await fs.readdir(SONGBOOKS_DIR)).filter((f) => f.endsWith('.txt'));
	const books: SongbookListItem[] = [];
	for (const f of files) {
		const entries = parseEntries(await fs.readFile(path.join(SONGBOOKS_DIR, f), 'utf-8'));
		books.push({ name: f.slice(0, -4), count: entries.length });
	}
	books.sort((a, b) => a.name.localeCompare(b.name, 'it'));
	return books;
}

export function parseEntries(content: string): string[] {
	return content
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l !== '' && !l.startsWith('#'));
}

export async function songbookExists(name: string): Promise<boolean> {
	try {
		await fs.access(fileFor(name));
		return true;
	} catch {
		return false;
	}
}

export async function readSongbook(name: string): Promise<string[]> {
	return parseEntries(await fs.readFile(fileFor(name), 'utf-8'));
}

export async function writeSongbook(name: string, entries: string[]): Promise<void> {
	await fs.writeFile(fileFor(name), entries.join('\n') + '\n', 'utf-8');
}

export async function deleteSongbook(name: string): Promise<void> {
	await fs.unlink(fileFor(name));
}
