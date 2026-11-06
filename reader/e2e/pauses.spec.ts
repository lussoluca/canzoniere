import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '../../shared/chordpro';
import { isTimedLine, linesFingerprint, songPauses, type Pauses } from '../../shared/pauses';

const SONG_URL = '/s/chiesa/danza_la_vita/';
const STORAGE_KEY = 'reader:pauses:chiesa/danza_la_vita';
const song = parse(fs.readFileSync(path.resolve('../canzoni/chiesa/danza_la_vita.cho'), 'utf-8'));
const timedCount = song.lines.filter(isTimedLine).length;

test.beforeEach(async ({ page }) => {
	page.on('pageerror', (e) => {
		throw new Error(`page error: ${e.message}`);
	});
});

async function open(page: Page, url = SONG_URL) {
	await page.goto(url);
	await page.locator('body[data-hydrated]').waitFor();
}

// Writes pauses learned "on this device" before the page loads.
async function seedDevicePauses(page: Page, pauses: Pauses) {
	const stored = { fp: linesFingerprint(song), base: songPauses(song), pauses };
	await page.addInitScript(
		([key, value]) => localStorage.setItem(key, value),
		[STORAGE_KEY, JSON.stringify(stored)]
	);
}

// The line at the reading point: the last timed line whose top has reached
// the bottom of the sticky controls.
function readingLineIn(page: Page): Promise<number | null> {
	return page.evaluate(() => {
		const y = document.querySelector('.controls')!.getBoundingClientRect().bottom;
		let found: number | null = null;
		for (const el of document.querySelectorAll<HTMLElement>('[data-line]')) {
			if (el.getBoundingClientRect().top <= y + 1) found = Number(el.dataset.line);
		}
		return found;
	});
}

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

async function startScroll(page: Page, speed = 3) {
	await page.getByRole('button', { name: '▶ Scorri' }).click();
	for (let s = 3; s < speed; s++) {
		await page.getByRole('button', { name: 'Scorri più velocemente' }).click();
	}
}

test('timed lines carry data-line and pause lines render nothing', async ({ page }) => {
	await open(page);
	await expect(page.locator('[data-line]')).toHaveCount(timedCount);
	await expect(page.locator('.sheet')).not.toContainText('x_pause');
});

test('autoscroll holds on a paused line, then resumes', async ({ page }) => {
	await seedDevicePauses(page, { 4: 4 });
	await open(page);
	await startScroll(page, 10);
	await expect.poll(() => readingLineIn(page), { timeout: 15_000, intervals: [50] }).toBe(4);
	const y = await scrollY(page);
	await page.waitForTimeout(1500);
	expect(await scrollY(page)).toBe(y);
	await expect.poll(() => scrollY(page), { timeout: 6000 }).toBeGreaterThan(y);
});

test('without pauses the scroll never stands still', async ({ page }) => {
	await open(page);
	await startScroll(page, 10);
	await page.waitForTimeout(1500); // initial glide
	let last = await scrollY(page);
	for (let i = 0; i < 5; i++) {
		await page.waitForTimeout(700);
		const now = await scrollY(page);
		expect(now).toBeGreaterThan(last);
		last = now;
	}
});

test('a pause on the last line never keeps the autoscroll from ending', async ({ page }) => {
	await seedDevicePauses(page, { [timedCount - 1]: 3 });
	await open(page);
	await startScroll(page, 10);
	await expect(page.getByRole('button', { name: '▶ Scorri' })).toBeVisible({ timeout: 55_000 });
	expect(
		await page.evaluate(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1)
	).toBe(true);
});
