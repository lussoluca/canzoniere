// Temporary songbooks opened from a shared link or QR, remembered on the
// device so they stay reachable from the main menu: without this the set
// lives only in the URL and closing the page loses it (the only way back
// would be scanning the QR again).

const KEY = 'reader:shared-collections';

// Enough for a season of events; the oldest entries fall off so the menu
// (and the storage) cannot grow without bound.
const MAX = 20;

export interface SharedCollection {
	/** Encoded song list, exactly as carried by the ?l= query parameter. */
	l: string;
	/** Title from the ?t= query parameter; empty when the set has none. */
	t: string;
}

export function loadSharedCollections(): SharedCollection[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		if (!Array.isArray(list)) return [];
		return list.filter(
			(c): c is SharedCollection =>
				typeof c === 'object' && c !== null && typeof c.l === 'string' && typeof c.t === 'string'
		);
	} catch {
		return [];
	}
}

function save(list: SharedCollection[]): void {
	try {
		if (list.length === 0) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		// storage full or unavailable: the set still works from the URL
	}
}

/**
 * Remember an opened set, most recent first. Reopening a known set (same
 * songs and prefs) moves it to the top and refreshes its title.
 */
export function rememberSharedCollection(l: string, t: string): void {
	if (typeof localStorage === 'undefined') return;
	const rest = loadSharedCollections().filter((c) => c.l !== l);
	save([{ l, t }, ...rest].slice(0, MAX));
}

/** Drop a remembered set; returns the updated list. */
export function forgetSharedCollection(l: string): SharedCollection[] {
	const list = loadSharedCollections().filter((c) => c.l !== l);
	save(list);
	return list;
}

/** Query string that reopens the set on the /raccolta/ page. */
export function sharedCollectionQuery(c: SharedCollection): string {
	const params = new URLSearchParams();
	params.set('l', c.l);
	if (c.t) params.set('t', c.t);
	return params.toString();
}
