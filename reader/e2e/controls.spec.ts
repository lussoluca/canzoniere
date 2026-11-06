import { test, expect, type Page } from '@playwright/test';

const SONG_URL = '/s/chiesa/danza_la_vita/';

test.beforeEach(async ({ page }) => {
	page.on('pageerror', (e) => {
		throw new Error(`page error: ${e.message}`);
	});
	await page.goto(SONG_URL);
	await page.locator('body[data-hydrated]').waitFor();
});

const barHeight = (page: Page) =>
	page.evaluate(() => document.querySelector('.controls')!.getBoundingClientRect().height);

test('the bar keeps its height and swaps its buttons while scrolling', async ({ page }) => {
	const stopped = await barHeight(page);
	await expect(page.getByRole('button', { name: 'Aspetto' })).toBeVisible();
	await page.getByRole('button', { name: '▶ Scorri' }).click();
	await expect(page.getByRole('button', { name: 'Aspetto' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Trasponi un semitono in su' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Scorri più velocemente' })).toBeVisible();
	expect(await barHeight(page)).toBe(stopped);
	await page.getByRole('button', { name: '⏸ Ferma' }).click();
	await expect(page.getByRole('button', { name: 'Trasponi un semitono in su' })).toBeVisible();
});

test('the Aa panel picks one chord mode out of three', async ({ page }) => {
	await page.getByRole('button', { name: 'Aspetto' }).click();
	const panel = page.getByRole('dialog', { name: 'Aspetto' });
	await expect(panel.getByRole('radio', { name: 'Completi' })).toHaveAttribute('aria-checked', 'true');
	await panel.getByRole('radio', { name: 'Nessuno' }).click();
	await expect(page.locator('.sheet .chords')).toHaveCount(0);
	await expect(panel.getByRole('button', { name: '🧭 Copilota' })).toHaveCount(0);
	await panel.getByRole('radio', { name: 'Semplici' }).click();
	await expect(panel.getByRole('radio', { name: 'Nessuno' })).toHaveAttribute('aria-checked', 'false');
	await expect(page.locator('.sheet .chords').first()).toBeVisible();
});

test('the menus close when scrolling starts or another one opens', async ({ page }) => {
	await page.getByRole('button', { name: 'Aspetto' }).click();
	await page.getByRole('button', { name: 'Altre azioni' }).click();
	await expect(page.getByRole('dialog', { name: 'Aspetto' })).toHaveCount(0);
	await page.getByRole('dialog', { name: 'Altre azioni' }).getByRole('button', { name: /nota/ }).click();
	await expect(page.getByRole('dialog', { name: 'Note sul canto' })).toBeVisible();
	await page.getByRole('button', { name: 'Aspetto' }).click();
	await expect(page.getByRole('dialog', { name: 'Note sul canto' })).toHaveCount(0);
	await page.getByRole('button', { name: '▶ Scorri' }).click();
	await expect(page.getByRole('dialog', { name: 'Aspetto' })).toHaveCount(0);
});

test('a key shift stays in sight while scrolling', async ({ page }) => {
	await page.getByRole('button', { name: 'Trasponi un semitono in su' }).click({ clickCount: 2 });
	await page.getByRole('button', { name: '▶ Scorri' }).click();
	await expect(page.locator('.controls .key')).toHaveText('+2');
});

test('student mode: the "⋯" menu says how many chords are left to learn', async ({ page }) => {
	await page.evaluate(() => localStorage.setItem('reader:student', '1'));
	await page.reload();
	await page.locator('body[data-hydrated]').waitFor();
	await page.getByRole('button', { name: 'Altre azioni' }).click();
	await expect(page.getByRole('button', { name: /🎓 Studia · \d+ accord[oi] da imparare/ })).toBeVisible();
});
