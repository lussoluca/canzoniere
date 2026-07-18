import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: { runes: true },
	kit: {
		adapter: adapter(),
		// BASE_PATH is set by CI when the app is deployed under a sub-path
		// (e.g. /canzoniere/app on GitHub Pages); empty for local dev.
		paths: { base: process.env.BASE_PATH ?? '' },
		// Chord/ChordPro logic is shared with the editor app.
		alias: { $songlib: '../shared' }
	}
};

export default config;
