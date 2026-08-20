import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// The build output is the online editor: every page is prerendered (the
		// server loads read ../canzoni at build time). The /api routes exist for
		// local development only, so they are not part of the static output.
		adapter: adapter({ strict: false }),
		// BASE_PATH is set by CI when the app is deployed under a sub-path
		// (e.g. /canzoniere/editor on GitHub Pages); empty for local dev.
		paths: { base: process.env.BASE_PATH ?? '' }
	}
};

export default config;
