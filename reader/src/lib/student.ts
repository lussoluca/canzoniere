// Student mode: an opt-in flag, kept on the device, that turns every song into
// an entry point to the guitar primer (tappable chords, a readiness line and
// the "study this song" panel). With it off the reader looks exactly as it did.

const KEY = 'reader:student';

export function loadStudentMode(): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(KEY) === '1';
}

export function saveStudentMode(on: boolean): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (on) localStorage.setItem(KEY, '1');
		else localStorage.removeItem(KEY);
	} catch {
		// storage full or unavailable: the choice just isn't remembered
	}
}
