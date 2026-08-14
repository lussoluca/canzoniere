// Temporary songbooks kept on the device: the ones built here and the ones
// opened from a shared link or QR. Without this a set lives only in the URL,
// so closing the page loses it (the only way back would be scanning the QR
// again, or rebuilding the set song by song).

// Key kept from when the list only held the sets received by link/QR, so the
// sets already remembered on a device survive.
const KEY = 'reader:shared-collections';

// Enough for a season of events; the oldest entries fall off so the menu
// (and the storage) cannot grow without bound.
const MAX = 20;

export interface SavedCollection {
	/** Encoded song list, exactly as carried by the ?l= query parameter. */
	l: string;
	/** Title from the ?t= query parameter; empty when the set has none. */
	t: string;
	/**
	 * Local identity of the set, carried by the ?i= query parameter. It stays
	 * the same while the set is edited, so reordering or renaming updates this
	 * entry instead of leaving a trail of half-built copies in the menu.
	 */
	id?: string;
}

export function loadSavedCollections(): SavedCollection[] {
	if (typeof localStorage === 'undefined') return [];
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return [];
		const list = JSON.parse(raw);
		if (!Array.isArray(list)) return [];
		return list.filter(
			(c): c is SavedCollection =>
				typeof c === 'object' && c !== null && typeof c.l === 'string' && typeof c.t === 'string'
		);
	} catch {
		return [];
	}
}

function save(list: SavedCollection[]): void {
	try {
		if (list.length === 0) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		// storage full or unavailable: the set still works from the URL
	}
}

/** New local identity, on the browsers without `crypto.randomUUID` too. */
export function newCollectionId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Remember a set, most recent first, and return the identity it is stored
 * under. An entry is the same set when it carries the given id or when it
 * encodes the same songs, so editing a set and reopening a known link both
 * update one entry instead of adding one.
 */
export function rememberCollection(l: string, t: string, id?: string): string | undefined {
	if (typeof localStorage === 'undefined') return id;
	const list = loadSavedCollections();
	const same = list.filter((c) => (id !== undefined && c.id === id) || c.l === l);
	// A set opened without an id keeps the one it was already stored under.
	const keptId = id ?? same.find((c) => c.id !== undefined)?.id;
	const rest = list.filter((c) => !same.includes(c));
	save([{ l, t, ...(keptId === undefined ? {} : { id: keptId }) }, ...rest].slice(0, MAX));
	return keptId;
}

/** Drop a remembered set; returns the updated list. */
export function forgetCollection(target: SavedCollection): SavedCollection[] {
	const list = loadSavedCollections().filter((c) =>
		target.id === undefined ? c.l !== target.l : c.id !== target.id
	);
	save(list);
	return list;
}

/** Query string that reopens the set on the /raccolta/ page. */
export function savedCollectionQuery(c: SavedCollection): string {
	const params = new URLSearchParams();
	params.set('l', c.l);
	if (c.t) params.set('t', c.t);
	if (c.id) params.set('i', c.id);
	return params.toString();
}
