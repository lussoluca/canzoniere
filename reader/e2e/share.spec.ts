import { test, expect } from '@playwright/test';

const BOOK_URL = '/k/apertura_2026/';

test.beforeEach(async ({ page, context }) => {
	page.on('pageerror', (e) => {
		throw new Error(`page error: ${e.message}`);
	});
	// No system share sheet in the test browser: sharing falls back to the clipboard.
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'share', { value: undefined });
	});
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto(BOOK_URL);
	await page.locator('body[data-hydrated]').waitFor();
});

test('an event songbook shares the link to its page', async ({ page }) => {
	await page.getByRole('button', { name: '📤 Condividi' }).click();
	await expect(page.getByRole('button', { name: 'Link copiato ✓' })).toBeVisible();
	const copied = await page.evaluate(() => navigator.clipboard.readText());
	expect(new URL(copied).pathname).toBe(BOOK_URL);
});

test('an event songbook shows its QR code', async ({ page }) => {
	await page.getByRole('button', { name: '⊞ QR code' }).click();
	const sheet = page.getByRole('dialog', { name: 'QR code del canzoniere' });
	await expect(sheet.locator('svg')).toBeVisible();
	await sheet.getByRole('button', { name: 'Chiudi il QR code' }).click();
	await expect(sheet).toHaveCount(0);
});
