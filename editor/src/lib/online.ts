// Online mode: the editor runs as a static app (GitHub Pages), edits pile up
// on the device and a button ships them to the backend, which opens a single
// pull request. Off in local development, where the /api routes write to the
// repo checkout directly.
export const online = import.meta.env.VITE_ONLINE === '1';

// The backend that turns queued edits into a pull request (see backend/).
export const API_BASE: string =
	import.meta.env.VITE_API_BASE ?? 'https://canzoniere-api-896377215116.europe-west1.run.app';
