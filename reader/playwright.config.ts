import { defineConfig } from '@playwright/test';

// Reader E2E tests run on the real songs (read-only) at a phone viewport.
export default defineConfig({
	testDir: 'e2e',
	timeout: 60_000,
	use: {
		baseURL: 'http://localhost:5175',
		viewport: { width: 390, height: 700 },
		hasTouch: true
	},
	webServer: {
		command: 'npm run dev -- --port 5175 --strictPort',
		port: 5175,
		reuseExistingServer: false,
		timeout: 120_000
	}
});
