// Per-song reading preferences (transpose/simplify) and global font size,
// persisted in localStorage so the device remembers them between sessions.

export interface SongPrefs {
	transpose: number;
	simplify: boolean;
	hideChords: boolean;
	scrollSpeed: number; // autoscroll speed level (SCROLL_MIN..SCROLL_MAX)
}

export const SCROLL_MIN = 1;
export const SCROLL_MAX = 10;
export const SCROLL_DEFAULT = 3;

const DEFAULT_PREFS: SongPrefs = {
	transpose: 0,
	simplify: false,
	hideChords: false,
	scrollSpeed: SCROLL_DEFAULT
};

function songKey(category: string, slug: string): string {
	return `reader:song:${category}/${slug}`;
}

// The song's authored autoscroll speed ({x_scroll:N} in the .cho) is the
// per-song default: it applies when the device has no saved override, and
// resetting to it clears the override. Callers pass it in; without it the
// global SCROLL_DEFAULT is used.
export function loadSongPrefs(
	category: string,
	slug: string,
	scrollDefault = SCROLL_DEFAULT
): SongPrefs {
	const base = { ...DEFAULT_PREFS, scrollSpeed: scrollDefault };
	if (typeof localStorage === 'undefined') return base;
	try {
		const raw = localStorage.getItem(songKey(category, slug));
		if (!raw) return base;
		return { ...base, ...JSON.parse(raw) };
	} catch {
		return base;
	}
}

export function saveSongPrefs(
	category: string,
	slug: string,
	prefs: SongPrefs,
	scrollDefault = SCROLL_DEFAULT
): void {
	if (typeof localStorage === 'undefined') return;
	const isDefault =
		prefs.transpose === 0 &&
		!prefs.simplify &&
		!prefs.hideChords &&
		prefs.scrollSpeed === scrollDefault;
	try {
		if (isDefault) localStorage.removeItem(songKey(category, slug));
		else localStorage.setItem(songKey(category, slug), JSON.stringify(prefs));
	} catch {
		// storage full or unavailable: reading still works, prefs just aren't kept
	}
}

// The raw override saved on this device, if any: only the prefs the user
// actually changed end up in a shared collection link.
export function loadSavedSongPrefs(category: string, slug: string): Partial<SongPrefs> | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const raw = localStorage.getItem(songKey(category, slug));
		return raw ? (JSON.parse(raw) as Partial<SongPrefs>) : null;
	} catch {
		return null;
	}
}

const FONT_KEY = 'reader:fontSize';
export const FONT_MIN = 12;
export const FONT_MAX = 26;
export const FONT_DEFAULT = 16;

export function loadFontSize(): number {
	if (typeof localStorage === 'undefined') return FONT_DEFAULT;
	const n = parseInt(localStorage.getItem(FONT_KEY) ?? '', 10);
	return Number.isFinite(n) ? Math.min(FONT_MAX, Math.max(FONT_MIN, n)) : FONT_DEFAULT;
}

export function saveFontSize(size: number): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(FONT_KEY, String(size));
	} catch {
		// ignore
	}
}
