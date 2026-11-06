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

// A correction as the guitarist makes it: finger down, page moved by dy
// (negative = back), optionally held still, finger up. Returns the reading
// line right after the finger lifts, where the correction is attributed.
async function correct(page: Page, dy: number, holdMs = 0): Promise<number | null> {
	await page.evaluate((dy) => {
		window.dispatchEvent(new TouchEvent('touchstart'));
		window.scrollBy(0, dy);
	}, dy);
	if (holdMs) await page.waitForTimeout(holdMs);
	// read in the same tick as the touchend, before the autoscroll moves on
	return page.evaluate(() => {
		window.dispatchEvent(new TouchEvent('touchend'));
		const y = document.querySelector('.controls')!.getBoundingClientRect().bottom;
		let found: number | null = null;
		for (const el of document.querySelectorAll<HTMLElement>('[data-line]')) {
			if (el.getBoundingClientRect().top <= y + 1) found = Number(el.dataset.line);
		}
		return found;
	});
}

const stored = (page: Page) =>
	page.evaluate((key) => {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw).pauses as Record<string, number>) : null;
	}, STORAGE_KEY);

const learnToggle = (page: Page) => page.getByRole('button', { name: '⏱ Impara i tempi' });

// Scrolls until the reading point is a few lines into the song, so a
// correction back still lands on a real line.
async function scrollInto(page: Page, line = 6) {
	await expect
		.poll(() => readingLineIn(page), { timeout: 30_000 })
		.toBeGreaterThanOrEqual(line);
}

test('learn off: corrections write nothing', async ({ page }) => {
	await open(page);
	await startScroll(page, 10);
	await scrollInto(page);
	await correct(page, -200);
	await correct(page, 0, 1500);
	expect(await stored(page)).toBeNull();
});

test('learn on: dragging back creates a pause on the reading line', async ({ page }) => {
	await open(page);
	await learnToggle(page).click();
	await startScroll(page, 10);
	await scrollInto(page);
	await page.getByRole('button', { name: 'Scorri più lentamente' }).click({ clickCount: 7 });
	const k = await correct(page, -96); // 96 px at speed 3 (24 px/s) = 4 s
	expect(await stored(page)).toEqual({ [String(k)]: 4 });
});

test('learn on: holding still creates a pause', async ({ page }) => {
	await open(page);
	await learnToggle(page).click();
	await startScroll(page, 10);
	await scrollInto(page);
	const k = await correct(page, 0, 2000);
	expect(await stored(page)).toEqual({ [String(k)]: 2 });
});

test('learn on: dragging forward reduces the previous pause', async ({ page }) => {
	await seedDevicePauses(page, { 2: 6 });
	await open(page);
	await learnToggle(page).click();
	await startScroll(page, 10);
	await scrollInto(page, 3);
	await page.getByRole('button', { name: 'Scorri più lentamente' }).click({ clickCount: 7 });
	await correct(page, 48); // 48 px at 24 px/s = 2 s less
	expect(await stored(page)).toEqual({ '2': 4 });
});

test('Proponi links to the editor, Azzera tempi drops the device pauses', async ({ page }) => {
	await seedDevicePauses(page, { 3: 5 });
	await open(page);
	const propose = page.getByRole('link', { name: 'Proponi questi tempi' });
	await expect(propose).toHaveAttribute(
		'href',
		/\/edit\/chiesa\/danza_la_vita\.cho\?pauses=3:5&fp=[0-9a-f]+$/
	);
	await page.getByRole('button', { name: 'Azzera tempi' }).click();
	expect(await stored(page)).toBeNull();
	await expect(propose).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Azzera tempi' })).toHaveCount(0);
});

test('learn mode turns off on another song', async ({ page }) => {
	await open(page, `${SONG_URL}?l=chiesa/tu_sei,chiesa/danza_la_vita`);
	await learnToggle(page).click();
	await expect(learnToggle(page)).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('link', { name: /^← Tu sei/ }).click();
	await expect(page).toHaveURL(/\/s\/chiesa\/tu_sei\//);
	await expect(learnToggle(page)).toHaveAttribute('aria-pressed', 'false');
});

test('set list link: learning is still saved', async ({ page }) => {
	await open(page, `${SONG_URL}?l=chiesa/danza_la_vita~t2`);
	await learnToggle(page).click();
	await startScroll(page, 10);
	await scrollInto(page);
	const k = await correct(page, -160); // 160 px at speed 10 (80 px/s) = 2 s
	expect(await stored(page)).toEqual({ [String(k)]: 2 });
});
