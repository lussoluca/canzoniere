// The online editor's local queue: songs edited on this device, waiting to be
// sent to the backend. Persisted in localStorage, exposed as reactive state so
// the layout badge follows every save.
import { browser } from '$app/environment';

export interface PendingSong {
	path: string; // canzoni/<category>/<file>.cho
	title: string;
	content: string;
	savedAt: number;
}

const STORAGE_KEY = 'editor:pending';

function readStorage(): PendingSong[] {
	if (!browser) return [];
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as PendingSong[]) : [];
	} catch {
		return [];
	}
}

const store = $state({ songs: readStorage() });

function persist() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(store.songs));
}

export function pendingSongs(): PendingSong[] {
	return store.songs;
}

export function pendingCount(): number {
	return store.songs.length;
}

export function getPending(path: string): PendingSong | undefined {
	return store.songs.find((s) => s.path === path);
}

export function savePending(path: string, title: string, content: string): void {
	const entry: PendingSong = { path, title, content, savedAt: Date.now() };
	const idx = store.songs.findIndex((s) => s.path === path);
	if (idx >= 0) store.songs[idx] = entry;
	else store.songs.push(entry);
	persist();
}

export function removePending(path: string): void {
	store.songs = store.songs.filter((s) => s.path !== path);
	persist();
}

export function clearPending(): void {
	store.songs = [];
	persist();
}
