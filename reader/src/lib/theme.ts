// Theme preference: the app follows the system theme until the header toggle
// forces light or dark; the explicit choice is kept in localStorage and applied
// as data-theme on <html> (app.html applies it before paint to avoid a flash).

export type Theme = 'light' | 'dark';

const KEY = 'reader:theme';

export function loadTheme(): Theme | null {
	if (typeof localStorage === 'undefined') return null;
	const v = localStorage.getItem(KEY);
	return v === 'light' || v === 'dark' ? v : null;
}

export function saveTheme(theme: Theme): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(KEY, theme);
	} catch {
		// storage full or unavailable: the theme just isn't remembered
	}
}

export function applyTheme(theme: Theme): void {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = theme;
}
