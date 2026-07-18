import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		// Songs (../canzoni), songbooks (../canzonieri) and the shared editor
		// lib live outside the app root.
		fs: { allow: ['..'] }
	}
});
