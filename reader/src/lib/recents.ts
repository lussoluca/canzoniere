// Automatic history of the last opened songs, stored in localStorage as
// "category/slug" keys from most to least recent. It builds itself as songs
// are opened; the home page shows it so last week's songs are one tap away.

const KEY = 'reader:recents';
const MAX = 10;

export function loadRecents(): string[] {
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

/** Move a song to the top of the history, keeping at most MAX entries. */
export function pushRecent(category: string, slug: string): void {
	if (typeof localStorage === 'undefined') return;
	const key = `${category}/${slug}`;
	const list = [key, ...loadRecents().filter((k) => k !== key)].slice(0, MAX);
	try {
		localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		// storage full or unavailable: the history just isn't kept
	}
}
