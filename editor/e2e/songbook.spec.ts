import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const TMP = path.resolve('e2e/.tmp-songs');

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
	page.on('pageerror', (e) => {
		throw new Error(`page error: ${e.message}`);
	});
});

async function goto(page: import('@playwright/test').Page, url: string) {
	await page.goto(url);
	await page.locator('body[data-hydrated]').waitFor();
}

test('home lists categories as folders, folder opens its song list', async ({ page }) => {
	await goto(page, '/');
	const folders = page.getByTestId('folder');
	await expect(folders).toHaveCount(3);
	await expect(folders.filter({ hasText: 'Reparto' })).toContainText('0 canzoni');
	const varie = folders.filter({ hasText: 'Varie' });
	await expect(varie).toContainText('1 canzoni');

	await varie.click();
	await expect(page).toHaveURL(/\/c\/varie/);
	const row = page.getByTestId('song-row').filter({ hasText: 'Stella del mattino' });
	await expect(row).toHaveCount(1);
});

test('create a song with the visual editor and verify the generated chordpro file', async ({
	page
}) => {
	// from the category page: the new-song link preselects the category
	await goto(page, '/c/reparto');
	await page.getByTestId('new-song').click();
	await page.locator('body[data-hydrated]').waitFor();
	await expect(page.getByTestId('meta-category')).toHaveValue('reparto');

	// metadata (no tag field: the tag is derived from the category)
	await page.getByTestId('meta-title').fill('Canzone di Prova');
	await page.getByTestId('meta-artist').fill('Gli Scout');

	// paste lyrics in the ChordPro tab, below the generated directives
	await page.getByTestId('tab-raw').click();
	const rawEditor = page.getByTestId('raw-editor');
	const head = (await rawEditor.inputValue()).trimEnd();
	const lyrics = [
		'Alla mattina ci alziamo presto',
		'e cantiamo questa canzone',
		'',
		'Il ritornello arriva adesso',
		'con la sua melodia'
	].join('\n');
	await rawEditor.fill(head + '\n\n' + lyrics);

	// back to the visual editor: 4 lyric lines parsed
	await page.getByTestId('tab-visual').click();
	const lyricLines = page.getByTestId('lyric-line');
	await expect(lyricLines).toHaveCount(4);

	// place [Do] at the start of line 1
	await lyricLines.nth(0).getByTestId('lyric-text').locator('button[data-pos="0"]').click();
	await page.getByTestId('chord-input').fill('Do');
	await page.getByTestId('chord-input').press('Enter');
	await expect(lyricLines.nth(0).getByTestId('chord-pill')).toHaveText('Do');

	// place [Sol] before "questa" on line 2 (pos 11)
	await lyricLines.nth(1).getByTestId('lyric-text').locator('button[data-pos="11"]').click();
	await page.getByTestId('chord-input').fill('Sol');
	await page.getByTestId('chord-input').press('Enter');

	// place [Fa] inside "ritornello" on line 3 (pos 4)
	await lyricLines.nth(2).getByTestId('lyric-text').locator('button[data-pos="4"]').click();
	await page.getByTestId('chord-input').fill('Fa');
	await page.getByTestId('chord-input').press('Enter');

	// save: creates the file and navigates to the edit page
	await page.getByTestId('save').click();
	await page.waitForURL('**/edit/reparto/canzone_di_prova.cho');

	const file = path.join(TMP, 'reparto', 'canzone_di_prova.cho');
	expect(fs.existsSync(file)).toBe(true);
	const content = fs.readFileSync(file, 'utf-8');
	expect(content).toBe(
		`{title:Canzone di Prova}
{artist:Gli Scout}
{tag:Reparto}

[Do]Alla mattina ci alziamo presto
e cantiamo [Sol]questa canzone

Il r[Fa]itornello arriva adesso
con la sua melodia
`
	);

	// reload: the editor renders the saved chords
	await page.reload();
	await expect(page.getByTestId('chord-pill')).toHaveCount(3);
	await expect(page.getByTestId('meta-title')).toHaveValue('Canzone di Prova');
});

test('edit an existing chord and move one by dragging', async ({ page }) => {
	await goto(page, '/edit/varie/stella_del_mattino.cho');

	const firstLine = page.getByTestId('lyric-line').nth(0);
	const pill = firstLine.getByTestId('chord-pill');
	await expect(pill).toHaveText('Do');

	// click the pill, change the chord to Rem
	await pill.click();
	await page.getByTestId('chord-input').fill('Rem');
	await page.getByTestId('chord-input').press('Enter');
	await expect(pill).toHaveText('Rem');

	// drag the pill 7 characters to the right ("Stella " -> before "del")
	const charBox = await firstLine
		.getByTestId('lyric-text')
		.locator('button[data-pos="0"]')
		.boundingBox();
	const charW = charBox!.width; // each char button is exactly 1ch wide
	const pillBox = await pill.boundingBox();
	const startX = pillBox!.x + pillBox!.width / 2;
	const startY = pillBox!.y + pillBox!.height / 2;
	await page.mouse.move(startX, startY);
	await page.mouse.down();
	await page.mouse.move(startX + charW * 7, startY, { steps: 5 });
	await page.mouse.up();
	await expect(pill).toHaveAttribute('data-pos', '7');

	// save and verify the file on disk
	await page.getByTestId('save').click();
	await expect(page.getByTestId('save-status')).toHaveText('Salvato ✓');

	const content = fs.readFileSync(path.join(TMP, 'varie', 'stella_del_mattino.cho'), 'utf-8');
	expect(content).toContain('Stella [Rem]del mattino brilla');
});

test('lyric line edit: Enter commits, Esc discards', async ({ page }) => {
	await goto(page, '/edit/varie/stella_del_mattino.cho');
	const firstLine = page.getByTestId('lyric-line').nth(0);

	// Enter commits
	await firstLine.hover();
	await firstLine.getByTestId('edit-lyric-text').click();
	const input = page.getByTestId('lyric-text-input');
	await expect(input).toBeFocused();
	await input.fill('Stella del mattino splende');
	await input.press('Enter');
	await expect(firstLine.getByTestId('lyric-text')).toContainText('splende');

	// Esc discards
	await firstLine.hover();
	await firstLine.getByTestId('edit-lyric-text').click();
	await input.fill('testo da scartare');
	await input.press('Escape');
	await expect(firstLine.getByTestId('lyric-text')).toContainText('splende');
	await expect(firstLine.getByTestId('lyric-text')).not.toContainText('scartare');
});

test('convert english chords to latin and transpose', async ({ page }) => {
	await goto(page, '/new?category=reparto');
	await page.getByTestId('meta-title').fill('Test Accordi');

	// paste english chords in the ChordPro tab
	await page.getByTestId('tab-raw').click();
	const rawEditor = page.getByTestId('raw-editor');
	const head = (await rawEditor.inputValue()).trimEnd();
	await rawEditor.fill(head + '\n\n[Am]Hello [C7]world [F#m]again [G/B]bye');

	// convert A,B,C -> La,Si,Do (in the raw tab)
	await page.getByTestId('convert-latin').click();
	await expect(rawEditor).toHaveValue(/\[Lam\]Hello \[Do7\]world \[Fa#m\]again \[Sol\/Si\]bye/);

	// transpose +1 in the visual tab: pills update
	await page.getByTestId('tab-visual').click();
	await page.getByTestId('transpose-up').click();
	const pills = page.getByTestId('chord-pill');
	await expect(pills.nth(0)).toHaveText('La#m');
	await expect(pills.nth(1)).toHaveText('Do#7');
	await expect(pills.nth(2)).toHaveText('Solm');
	await expect(pills.nth(3)).toHaveText('Sol#/Do');

	// -1 brings them back
	await page.getByTestId('transpose-down').click();
	await expect(pills.nth(0)).toHaveText('Lam');

	// save and check the file
	await page.getByTestId('save').click();
	await page.waitForURL('**/edit/reparto/test_accordi.cho');
	const content = fs.readFileSync(path.join(TMP, 'reparto', 'test_accordi.cho'), 'utf-8');
	expect(content).toContain('[Lam]Hello [Do7]world [Fa#m]again [Sol/Si]bye');
});

test('move a song to a different category', async ({ page }) => {
	// move varie -> clan from the category page row select
	await goto(page, '/c/varie');
	const row = page.getByTestId('song-row').filter({ hasText: 'Stella del mattino' });
	await row.getByTestId('move-select').selectOption('clan');
	await expect(row).toHaveCount(0);

	const moved = path.join(TMP, 'clan', 'stella_del_mattino.cho');
	expect(fs.existsSync(moved)).toBe(true);
	expect(fs.existsSync(path.join(TMP, 'varie', 'stella_del_mattino.cho'))).toBe(false);
	expect(fs.readFileSync(moved, 'utf-8')).toContain('{tag:Clan}');

	// move back clan -> varie from the edit page category select
	await goto(page, '/edit/clan/stella_del_mattino.cho');
	await page.getByTestId('meta-category').selectOption('varie');
	await page.getByTestId('save').click();
	await page.waitForURL('**/edit/varie/stella_del_mattino.cho');

	const back = path.join(TMP, 'varie', 'stella_del_mattino.cho');
	expect(fs.existsSync(back)).toBe(true);
	expect(fs.existsSync(moved)).toBe(false);
	expect(fs.readFileSync(back, 'utf-8')).toContain('{tag:Varie}');
});

test('event songbooks: list, view, create, edit, delete', async ({ page }) => {
	const TMP_BOOKS = path.resolve('e2e/.tmp-songbooks');

	// list shows the seeded songbook
	await goto(page, '/songbooks');
	const seeded = page.getByTestId('songbook-row').filter({ hasText: 'uscita_2026' });
	await expect(seeded).toHaveCount(1);
	await expect(seeded).toContainText('1');

	// view: the entry resolves to the song title
	await seeded.getByRole('link').click();
	await expect(page.getByTestId('songbook-entry')).toContainText('Stella del mattino');

	// create a new songbook
	await goto(page, '/songbooks');
	await page.getByTestId('new-songbook-name').fill('Campo Estivo');
	await page.getByTestId('new-songbook-create').click();
	await page.waitForURL('**/songbooks/campo_estivo');

	// add both available songs, reorder, save
	await page.getByTestId('picker-add').first().click();
	await page.getByTestId('picker-add').first().click();
	await expect(page.getByTestId('songbook-entry')).toHaveCount(2);
	await page.getByTestId('songbook-save').click();
	await expect(page.getByTestId('songbook-status')).toHaveText('Salvato ✓');

	const file = path.join(TMP_BOOKS, 'campo_estivo.txt');
	const lines = fs.readFileSync(file, 'utf-8').trim().split('\n');
	expect(lines).toHaveLength(2);
	for (const l of lines) expect(l).toMatch(/^(clan|reparto|varie)\/.+\.cho$/);

	// remove one entry and save again
	await page.getByTestId('entry-remove').first().click();
	await page.getByTestId('songbook-save').click();
	await expect(page.getByTestId('songbook-status')).toHaveText('Salvato ✓');
	expect(fs.readFileSync(file, 'utf-8').trim().split('\n')).toHaveLength(1);

	// delete the songbook from the list
	await goto(page, '/songbooks');
	page.on('dialog', (d) => d.accept());
	const row = page.getByTestId('songbook-row').filter({ hasText: 'campo_estivo' });
	await row.getByRole('button', { name: 'Elimina' }).click();
	await expect(row).toHaveCount(0);
	expect(fs.existsSync(file)).toBe(false);
});

test('delete a song from the category page', async ({ page }) => {
	await goto(page, '/c/varie');
	page.on('dialog', (d) => d.accept());
	const row = page.getByTestId('song-row').filter({ hasText: 'Stella del mattino' });
	await row.getByRole('button', { name: 'Elimina' }).click();
	await expect(row).toHaveCount(0);
	expect(fs.existsSync(path.join(TMP, 'varie', 'stella_del_mattino.cho'))).toBe(false);
});
