// Favorite songs, stored in localStorage as a list of "category/slug" keys so
// the device remembers the group's live repertoire between sessions.

const KEY = 'reader:favorites';

export function favoriteKey(category: string, slug: string): string {
	return `${category}/${slug}`;
}

export function loadFavorites(): string[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		return Array.isArray(list) ? list.filter((k) => typeof k === 'string') : [];
	} catch {
		return [];
	}
}

export function isFavorite(category: string, slug: string): boolean {
	return loadFavorites().includes(favoriteKey(category, slug));
}

/** Add or remove a song from the favorites; returns the new state. */
export function toggleFavorite(category: string, slug: string): boolean {
	const key = favoriteKey(category, slug);
	const list = loadFavorites();
	const idx = list.indexOf(key);
	if (idx === -1) list.push(key);
	else list.splice(idx, 1);
	try {
		if (list.length === 0) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		// storage full or unavailable: reading still works, the star just isn't kept
	}
	return idx === -1;
}
