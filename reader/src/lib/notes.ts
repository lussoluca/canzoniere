// Free-text note per song (intro, who sings what, strumming hints), persisted
// in localStorage so the group's way of doing a song stays on the device.

function noteKey(category: string, slug: string): string {
	return `reader:note:${category}/${slug}`;
}

export function loadNote(category: string, slug: string): string {
	if (typeof localStorage === 'undefined') return '';
	try {
		return localStorage.getItem(noteKey(category, slug)) ?? '';
	} catch {
		return '';
	}
}

export function saveNote(category: string, slug: string, text: string): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (text.trim() === '') localStorage.removeItem(noteKey(category, slug));
		else localStorage.setItem(noteKey(category, slug), text);
	} catch {
		// storage full or unavailable: reading still works, the note just isn't kept
	}
}
