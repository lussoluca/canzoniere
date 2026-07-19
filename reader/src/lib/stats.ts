// Local memory of how the repertoire is actually used: for every opened song
// the device keeps how many times and when it was last opened (localStorage,
// nothing leaves the device). The "Memoria del repertorio" page reads it to
// surface classics, forgotten songs and never-explored ones.

import { allSongs, type SongRef } from '$lib/data';

const KEY = 'reader:song-stats';

// A song is "forgotten" when it was a regular (opened at least FORGOTTEN_MIN
// times) but hasn't been opened for FORGOTTEN_AFTER_DAYS.
const FORGOTTEN_MIN = 3;
const FORGOTTEN_AFTER_DAYS = 90;

interface Stat {
	n: number; // times opened
	last: number; // epoch ms of the last opening
}

type Stats = Record<string, Stat>;

function loadStats(): Stats {
	if (typeof localStorage === 'undefined') return {};
	try {
		const raw = localStorage.getItem(KEY);
		const obj = raw ? JSON.parse(raw) : {};
		return obj && typeof obj === 'object' ? obj : {};
	} catch {
		return {};
	}
}

export function recordOpen(category: string, slug: string): void {
	if (typeof localStorage === 'undefined') return;
	const stats = loadStats();
	const key = `${category}/${slug}`;
	const prev = stats[key];
	stats[key] = { n: (prev?.n ?? 0) + 1, last: Date.now() };
	try {
		localStorage.setItem(KEY, JSON.stringify(stats));
	} catch {
		// storage full or unavailable: the memory just isn't kept
	}
}

export interface RepertoireMemory {
	classics: { song: SongRef; n: number }[];
	forgotten: { song: SongRef; n: number; days: number }[];
	neverOpened: SongRef[];
	rediscovery: SongRef | null; // weekly stable pick among the never opened
}

export function repertoireMemory(now = Date.now()): RepertoireMemory {
	const stats = loadStats();
	const bySong = new Map(allSongs.map((s) => [`${s.category}/${s.slug}`, s]));

	const classics: { song: SongRef; n: number }[] = [];
	const forgotten: { song: SongRef; n: number; days: number }[] = [];
	for (const [key, stat] of Object.entries(stats)) {
		const song = bySong.get(key);
		if (!song) continue; // song removed from the repository
		if (stat.n >= 2) classics.push({ song, n: stat.n });
		const days = Math.floor((now - stat.last) / 86_400_000);
		if (stat.n >= FORGOTTEN_MIN && days >= FORGOTTEN_AFTER_DAYS) {
			forgotten.push({ song, n: stat.n, days });
		}
	}
	classics.sort((a, b) => b.n - a.n || a.song.title.localeCompare(b.song.title, 'it'));
	forgotten.sort((a, b) => b.days - a.days);

	const neverOpened = allSongs.filter((s) => !(`${s.category}/${s.slug}` in stats));

	// Same proposal for the whole ISO week, so it feels like "the song of the
	// week" and not a slot machine.
	let rediscovery: SongRef | null = null;
	if (neverOpened.length > 0) {
		const week = Math.floor(now / (7 * 86_400_000));
		rediscovery = neverOpened[week % neverOpened.length];
	}

	return { classics: classics.slice(0, 10), forgotten, neverOpened, rediscovery };
}
