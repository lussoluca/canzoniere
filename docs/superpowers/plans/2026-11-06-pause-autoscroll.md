# Autoscroll pauses learned by playing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The reader's autoscroll holds for N seconds on chosen lines; the pauses are learned from the guitarist's corrections in an explicit "Impara i tempi" mode, kept on the device, and proposed to the songbook through the online editor as `{x_pause:N}` lines.

**Architecture:** A pure module `shared/pauses.ts` owns the pause model (line indexing, fingerprint, query-string encoding, device-state validation, learning arithmetic) and is used by both apps; `shared/chordpro.ts` gains a `pause` line type. The reader adds pause playback and learning to the existing autoscroll loop plus a small localStorage module; the editor shows pauses as editable lines and imports a proposal from the query string.

**Tech Stack:** SvelteKit 2 / Svelte 5, TypeScript, Playwright (editor `e2e/`), Go printer (unchanged).

**Spec:** `docs/superpowers/specs/2026-11-06-pause-autoscroll-design.md`

## Global Constraints

- File format: `{x_pause:N}` on its own line right after the line it belongs to; N = whole seconds, 1..60 (`PAUSE_MAX = 60`, builder's cap from the spec).
- A pause belongs to the nearest preceding *timed* line: `lyric`, `comment` or `tab`. Line indices count timed lines only, from 0.
- Lines fingerprint covers timed lines only (pause lines, empties, chorus markers, other directives excluded).
- Learning only while "Impara i tempi" is on; it turns off on song change; nothing is learned or written otherwise.
- With no `{x_pause}` in the song and no device pauses, autoscroll behaves exactly as today.
- Reader: all text in Italian; styles local, colours from theme CSS variables only; links via `resolve(...)`.
- The editor password never reaches the reader.
- `printer/` and the ChordPro CLI must ignore `{x_pause}` (printer already skips every `{...}` line; ChordPro ignores `x_` directives) — no change there.
- Keep `AGENTS.md` in sync (file format, reader map).
- Commit messages in Italian, like the repo history, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Pure logic goes in `shared/pauses.ts`, tested from the editor's Playwright suite. The reader gets its own Playwright suite (`reader/e2e/`, Task 2), read-only on the real `canzoni/`: tests inject device pauses into localStorage instead of editing `.cho` files. Song used: `chiesa/danza_la_vita.cho` (long enough to scroll on a phone viewport).

## Review Focus

1. Malformed proposal links (`pauses=abc`, `0`, `-3`, `999`, an index past the last line, missing `fp`): the editor applies nothing invalid — values are clamped to 1..60, junk entries and out-of-range indices dropped, missing/mismatched `fp` shows the mismatch message. → tests in Task 1 (`decodePauses`, `withPauses`) and Task 4 (E2E).
2. Pause directives in odd places: before the first timed line (dropped), two on the same line (summed, capped at 60), inside a chorus or after a blank line (still the preceding timed line). → Task 1 tests.
3. The `.cho` changed after the device learned (lyrics edited, or official pauses changed by a merged proposal): device pauses are discarded, official ones apply. → Task 1 `resolveDevicePauses` tests.
4. Dragging or holding while learn mode is off, or with the autoscroll stopped: no localStorage writes. → Task 3 manual check.
5. A pause on one of the last lines, which may never reach the reading point because the page bottoms out first: autoscroll still ends normally (no hang). → Task 2 manual check.

---

### Task 1: Pause model in `shared/`

**Files:**
- Modify: `shared/chordpro.ts` (Line union, `parse`, `serialize`)
- Create: `shared/pauses.ts`
- Create: `editor/e2e/pauses.spec.ts` (pure unit tests, no `page` fixture; import with relative paths `../../shared/pauses` and `../../shared/chordpro`)
- Modify: `AGENTS.md` (Repository layout: mention `{x_pause:N}` next to `{x_tag}`; `shared/` list: `pauses.ts`)

**Interfaces:**
- Produces in `shared/chordpro.ts`: `Line` gains `| { type: 'pause'; seconds: number }`. `parse` turns `{x_pause:N}` with N a positive integer into it (otherwise it stays a `directive`); `serialize` writes `{x_pause:N}`.
- Produces in `shared/pauses.ts`:
  - `export type Pauses = Record<number, number>;` — timed-line index → seconds
  - `export const PAUSE_MAX = 60;`
  - `export function isTimedLine(line: Line): boolean`
  - `export function songPauses(song: Song): Pauses`
  - `export function withPauses(song: Song, pauses: Pauses): Song` — new Song; removes every `pause` line, inserts `{ type: 'pause', seconds }` immediately after timed line k; indices with no timed line are ignored
  - `export function linesFingerprint(song: Song): string` — FNV-1a 32-bit, lowercase hex, over the timed lines as `type + '\u0000' + text` joined by `'\n'` (lyric text without chords)
  - `export function encodePauses(p: Pauses): string` — `"12:8,30:4"`, ascending index
  - `export function decodePauses(s: string): Pauses` — skips malformed entries, rounds and clamps seconds to 1..PAUSE_MAX, drops entries ≤ 0
  - `export function samePauses(a: Pauses, b: Pauses): boolean`
  - `export function adjustPause(p: Pauses, line: number, deltaSeconds: number): Pauses` — new object; `round(old + delta)` clamped to 0..PAUSE_MAX, key removed at 0
  - `export function pausedLineAtOrBefore(p: Pauses, line: number): number | null`
  - `export interface StoredPauses { fp: string; base: Pauses; pauses: Pauses }`
  - `export function resolveDevicePauses(stored: StoredPauses | null, song: Song): Pauses | null` — null when stored is null, `fp` differs from `linesFingerprint(song)`, or `base` differs from `songPauses(song)`; else `stored.pauses`

- [ ] **Step 1: Write the failing tests in `editor/e2e/pauses.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
import { parse, serialize } from '../../shared/chordpro';
import {
	songPauses, withPauses, linesFingerprint, encodePauses, decodePauses,
	adjustPause, pausedLineAtOrBefore, resolveDevicePauses
} from '../../shared/pauses';

const SRC = `{title:T}

{x_pause:3}
[Re]uno
{comment:Rit.}
{start_of_chorus}
due
{x_pause:8}
{end_of_chorus}

tre
{x_pause:5}
{x_pause:2}
`;

test('x_pause round-trips through parse/serialize', () => {
	const song = parse(SRC);
	expect(song.lines.filter((l) => l.type === 'pause')).toHaveLength(4);
	expect(serialize(song)).toContain('due\n{x_pause:8}\n{end_of_chorus}');
	expect(parse('{title:T}\n\nuno\n{x_pause:abc}').lines[1]).toEqual({ type: 'directive', raw: '{x_pause:abc}' });
});

test('songPauses attaches to the preceding timed line, drops leading, sums repeats', () => {
	// timed lines: 0 "uno", 1 comment "Rit.", 2 "due", 3 "tre"
	expect(songPauses(parse(SRC))).toEqual({ 2: 8, 3: 7 });
	expect(songPauses(parse('{title:T}\n\nuno\n{x_pause:50}\n{x_pause:50}'))).toEqual({ 0: 60 });
});

test('withPauses replaces pause lines and ignores out-of-range indices', () => {
	const out = withPauses(parse(SRC), { 0: 4, 9: 9 });
	expect(songPauses(out)).toEqual({ 0: 4 });
	expect(serialize(out)).toContain('[Re]uno\n{x_pause:4}\n{comment:Rit.}');
});

test('fingerprint ignores chords, pauses and blank lines, not text', () => {
	const fp = linesFingerprint(parse(SRC));
	expect(linesFingerprint(parse(SRC.replace('[Re]', '[Mi]').replace('{x_pause:8}\n', '')))).toBe(fp);
	expect(linesFingerprint(parse(SRC.replace('tre', 'quattro')))).not.toBe(fp);
});

test('encode/decode: sorted, clamped, junk dropped', () => {
	expect(encodePauses({ 30: 4, 12: 8 })).toBe('12:8,30:4');
	expect(decodePauses('12:8,abc,3:0,4:-2,5:999,6:2.6')).toEqual({ 12: 8, 5: 60, 6: 3 });
	expect(decodePauses('')).toEqual({});
});

test('learning arithmetic', () => {
	expect(adjustPause({}, 2, 3.4)).toEqual({ 2: 3 });
	expect(adjustPause({ 2: 3 }, 2, -5)).toEqual({});
	expect(pausedLineAtOrBefore({ 1: 2, 5: 4 }, 4)).toBe(1);
	expect(pausedLineAtOrBefore({ 5: 4 }, 4)).toBeNull();
});

test('device pauses are dropped when lyrics or official pauses change', () => {
	const song = parse(SRC);
	const stored = { fp: linesFingerprint(song), base: songPauses(song), pauses: { 0: 6 } };
	expect(resolveDevicePauses(stored, song)).toEqual({ 0: 6 });
	expect(resolveDevicePauses(null, song)).toBeNull();
	expect(resolveDevicePauses(stored, parse(SRC.replace('tre', 'quattro')))).toBeNull();
	expect(resolveDevicePauses(stored, parse(SRC.replace('{x_pause:8}', '{x_pause:9}')))).toBeNull();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd editor && npx playwright test e2e/pauses.spec.ts`
Expected: FAIL — cannot resolve `../../shared/pauses`.

- [ ] **Step 3: Add the `pause` line type to `shared/chordpro.ts`**

`case 'x_pause'` in `parse`: `parseInt` > 0 → `{ type: 'pause', seconds }`, else fall through to the `directive` push. `serialize`: `case 'pause'` → `` `{x_pause:${line.seconds}}` ``.

- [ ] **Step 4: Implement `shared/pauses.ts`** with the signatures above (`import type { Line, Song } from './chordpro';`). `songPauses` caps sums at `PAUSE_MAX`.

- [ ] **Step 5: Run the tests**

Run: `cd editor && npx playwright test e2e/pauses.spec.ts`
Expected: 7 passed.

- [ ] **Step 6: Typecheck both apps** (the new union member must not break exhaustive switches)

Run: `cd editor && npm run check && cd ../reader && npm run check`
Expected: 0 errors. If `SongSheet.svelte` or `SongEditor.svelte` complain, leave them for Tasks 2/4 only if the error is a missing branch those tasks add; otherwise fix here.

- [ ] **Step 7: Update `AGENTS.md`, commit**

```bash
git add shared/chordpro.ts shared/pauses.ts editor/e2e/pauses.spec.ts AGENTS.md
git commit -m "Aggiunge le pause dello scorrimento al modello ChordPro condiviso"
```

---

### Task 2: Reader plays the pauses

**Files:**
- Modify: `reader/src/lib/components/SongSheet.svelte` (skip `pause` lines; mark timed lines)
- Create: `reader/src/lib/pauses.ts`
- Modify: `reader/src/routes/s/[category]/[slug]/+page.svelte` (autoscroll loop)
- Modify: `AGENTS.md` (reader modules: `pauses.ts`; reader test command)
- Create: `reader/playwright.config.ts`, `reader/e2e/pauses.spec.ts`
- Modify: `reader/package.json` (devDependency `@playwright/test`, same version as editor; script `"test": "playwright test"`), `reader/.gitignore` (`/test-results`, `/playwright-report`)
- Modify: `.github/actions/test-stack/action.yml` (after "Check reader": install Chromium, `cd reader && npm test`)

**Interfaces:**
- Consumes: Task 1 `Pauses`, `songPauses`, `linesFingerprint`, `resolveDevicePauses`, `StoredPauses`, `samePauses`.
- Test setup: `reader/playwright.config.ts` mirrors the editor's (testDir `e2e`, webServer `npm run dev -- --port 5175 --strictPort`, baseURL `http://localhost:5175`) with `use: { viewport: { width: 390, height: 700 }, hasTouch: true }`. Helper in the spec: `seedDevicePauses(page, pauses)` → `page.addInitScript` writing `reader:pauses:chiesa/danza_la_vita` = `{ fp, base: songPauses(song), pauses }`, with `song = parse(fs.readFileSync('../canzoni/chiesa/danza_la_vita.cho'))`.
- Produces:
  - SongSheet: every rendered timed line's root element gets `data-line={k}` (k = timed-line index, same counting as `isTimedLine`); `pause` lines render nothing.
  - `reader/src/lib/pauses.ts` (localStorage key `reader:pauses:<category>/<slug>`, try/catch like `notes.ts`):
    - `loadDevicePauses(category: string, slug: string, song: Song): Pauses | null` — via `resolveDevicePauses`; removes the key when it resolves to null
    - `saveDevicePauses(category: string, slug: string, song: Song, pauses: Pauses): void` — stores `{ fp, base: songPauses(song), pauses }`; removes the key when `samePauses(pauses, songPauses(song))`
    - `clearDevicePauses(category: string, slug: string): void`
  - Song page: `const officialPauses = $derived(songPauses(song))`, `let devicePauses = $state<Pauses | null>(null)` (loaded in the per-song `$effect`, independent of `ready`/shared prefs), `const activePauses = $derived(devicePauses ?? officialPauses)`; `function readingLine(): number | null` — the `data-line` element under the y just below the sticky `.controls` (last one whose top ≤ that y).

- [ ] **Step 0: Reader test setup and failing tests** — install `@playwright/test`, add config, script, gitignore and CI step as listed. In `reader/e2e/pauses.spec.ts`:

```ts
test('timed lines carry data-line and pause lines render nothing', async ({ page }) => {
	await page.goto('/s/chiesa/danza_la_vita/');
	const timed = song.lines.filter(isTimedLine).length;
	await expect(page.locator('[data-line]')).toHaveCount(timed);
	await expect(page.locator('.sheet')).not.toContainText('x_pause');
});

test('autoscroll holds on a paused line, then resumes', async ({ page }) => {
	await seedDevicePauses(page, { 4: 3 });
	await page.goto('/s/chiesa/danza_la_vita/');
	await page.getByRole('button', { name: '▶ Scorri' }).click();
	// wait until line 4 is at the reading point, then the page must stand still ~3 s
	await expect.poll(() => readingLineIn(page), { timeout: 15_000 }).toBe(4);
	const y = await page.evaluate(() => window.scrollY);
	await page.waitForTimeout(2000);
	expect(await page.evaluate(() => window.scrollY)).toBe(y);
	await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBeGreaterThan(y);
});

test('without pauses the scroll never stands still', async ({ page }) => {
	await page.goto('/s/chiesa/danza_la_vita/');
	await page.getByRole('button', { name: '▶ Scorri' }).click();
	// sample scrollY every second for 5 s after the glide: strictly increasing
});
```

`readingLineIn(page)` evaluates the same rule as the page's `readingLine()` (last `[data-line]` whose top ≤ bottom of `.controls`). Run `cd reader && npm test` → FAIL (no `data-line`).

- [ ] **Step 1: SongSheet** — `continue` on `pause` in `displayLines`; compute the timed index while building `displayLines`; add `data-line` on `.line`, `.comment` and `.tab` elements.

- [ ] **Step 2: `reader/src/lib/pauses.ts`** with the three functions above.

- [ ] **Step 3: Pause playback in the autoscroll `$effect`** — state per run: `holdUntil: number | null`, `done: Set<number>`. In `step`, after the glide and before advancing: if `holdUntil` and `now < holdUntil`, keep `last = now` and skip the advance; else `const k = readingLine()`; if `k !== null && activePauses[k] && !done.has(k)` → `done.add(k)`, `holdUntil = now + activePauses[k] * 1000`. The bottom-of-page stop stays as is. Move the inline `8` into `export const SCROLL_PX_PER_LEVEL = 8` in `reader/src/lib/prefs.ts` (Task 3 converts with it).

- [ ] **Step 4: Tests, typecheck, build**

Run: `cd reader && npm test && npm run check && npm run build`
Expected: 3 passed, 0 errors, build succeeds.

- [ ] **Step 5: Add the Review Focus 5 test** — `seedDevicePauses(page, { <last timed index>: 3 })`, start the scroll at speed 10 (bump `+` until 10), expect the "▶ Scorri" button to come back within 30 s (the autoscroll ended at the bottom). Run `npm test` → 4 passed.

- [ ] **Step 6: Commit**

```bash
git add reader/package.json reader/package-lock.json reader/playwright.config.ts reader/e2e reader/.gitignore .github/actions/test-stack/action.yml reader/src/lib/components/SongSheet.svelte reader/src/lib/pauses.ts reader/src/lib/prefs.ts "reader/src/routes/s/[category]/[slug]/+page.svelte" AGENTS.md
git commit -m "Il reader si ferma sulle pause della canzone durante lo scorrimento"
```

---

### Task 3: Reader learns and proposes

**Files:**
- Modify: `reader/src/routes/s/[category]/[slug]/+page.svelte`
- Modify: `reader/src/lib/pauses.ts` (proposal link)
- Modify: `AGENTS.md` (song page: learn mode)

**Interfaces:**
- Consumes: Task 1 `adjustPause`, `pausedLineAtOrBefore`, `encodePauses`, `linesFingerprint`, `samePauses`; Task 2 `readingLine`, `activePauses`, `devicePauses`, `saveDevicePauses`, `clearDevicePauses`, `SCROLL_PX_PER_LEVEL`.
- Produces:
  - `proposalHref(category: string, slug: string, song: Song, pauses: Pauses): string` in `reader/src/lib/pauses.ts` → `` `${EDITOR_BASE}/edit/${category}/${slug}.cho?pauses=${encodePauses(pauses)}&fp=${linesFingerprint(song)}` `` with `const EDITOR_BASE = import.meta.env.VITE_EDITOR_BASE ?? '/canzoniere/editor'`.
  - Page state `let learning = $state(false)`, reset to false in the per-song `$effect`.

- [ ] **Step 1: Learning in the autoscroll `$effect`** — only when `learning` is true. On `touchstart` record `startY = window.scrollY`, `startT = now`. On `touchend`:
  - `back = startY - window.scrollY`; `px/s = scrollSpeed * SCROLL_PX_PER_LEVEL`; `k = readingLine()`.
  - `back > 0` and `back / pxs ≥ 1` → `adjustPause(activePauses, k, back / pxs)`.
  - `back < 0` and `-back / pxs ≥ 1` → on `pausedLineAtOrBefore(activePauses, k)` (if any) `adjustPause(…, -(-back / pxs))`.
  - `|back| < 10` and held ≥ 1 s → `adjustPause(activePauses, k, heldSeconds)`.
  - Result → `devicePauses = …; saveDevicePauses(...)`. Threshold 1 s / 10 px is the builder's choice from the spec.

- [ ] **Step 2: Controls** in the "Scorrimento automatico" group, after the speed buttons:
  - toggle `⏱ Impara i tempi` (`class="toggle"`, `class:active={learning}`, `aria-pressed`);
  - `Azzera tempi` when `devicePauses` → `clearDevicePauses(...)`, `devicePauses = null`;
  - link `Proponi questi tempi` (`href={proposalHref(...)}`) when `devicePauses && !samePauses(devicePauses, officialPauses)`. External to the reader's routes, so a plain `href`, not `resolve(...)`.

- [ ] **Step 3: Tests** in `reader/e2e/pauses.spec.ts`. A correction is simulated in the page: `dispatchEvent(new TouchEvent('touchstart'))` on `window`, `window.scrollBy(0, dy)`, optional wait, `touchend`. Helper `correct(page, dy, holdMs = 0)`.
  - `learn off: corrections write nothing` — scroll on, `correct(page, -200)` → `localStorage.getItem('reader:pauses:chiesa/danza_la_vita')` is null (Review Focus 4);
  - `learn on: dragging back creates a pause on the reading line` — click `⏱ Impara i tempi`, scroll on at speed 3 (24 px/s), `correct(page, -96)` → stored `pauses` has one entry of 4 at `readingLineIn(page)`;
  - `learn on: holding still creates a pause` — `correct(page, 0, 2000)` → one entry of 2;
  - `learn on: dragging forward reduces the previous pause` — seed `{ 2: 6 }`, learn on, scroll until reading line ≥ 2, `correct(page, 48)` at speed 3 → `{ 2: 4 }`;
  - `Azzera tempi and Proponi` — seed `{ 3: 5 }` → "Proponi questi tempi" `href` matches `/\/edit\/chiesa\/danza_la_vita\.cho\?pauses=3:5&fp=[0-9a-f]+$/`; click "Azzera tempi" → key gone, both controls hidden;
  - `learn mode turns off on another song` — learn on, navigate to another song via client nav, back → toggle not active;
  - `set list link: learning still saved` — open `/s/chiesa/danza_la_vita/?l=<encodeCollection with transpose 2>` (sharedPrefs differ), learn on, `correct(page, -96)` → key written.

Run `cd reader && npm test` → FAIL (no learn toggle).

- [ ] **Step 4: Implement until green, then typecheck and build**

Run: `cd reader && npm test && npm run check && npm run build`
Expected: all passed, 0 errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add reader/src/lib/pauses.ts reader/e2e/pauses.spec.ts "reader/src/routes/s/[category]/[slug]/+page.svelte" AGENTS.md
git commit -m "Il reader impara le pause dalle correzioni e le propone all'editor"
```

---

### Task 4: Editor shows, edits and imports pauses

**Files:**
- Modify: `editor/src/lib/components/SongEditor.svelte` (render `pause`, add-menu entry)
- Modify: `editor/src/routes/edit/[category]/[file]/+page.svelte` (query import)
- Modify: `editor/e2e/songbook.spec.ts` (E2E)
- Modify: `AGENTS.md` (Web editor: pause pill, proposal import)

**Interfaces:**
- Consumes: Task 1 `decodePauses`, `withPauses`, `linesFingerprint`, `Line` `pause`.
- Produces: visual line `data-testid="pause-line"` containing `<input type="number" min="1" max="60" data-testid="pause-seconds">`, label "⏸ … s"; add-menu item `{ label: 'pausa scorrimento', testid: 'add-pause', make: () => ({ type: 'pause', seconds: 4 }) }`; notices `data-testid="pause-import"` (applied) and `data-testid="pause-import-error"` (mismatch).

- [ ] **Step 1: Write the failing E2E tests** at the end of `editor/e2e/songbook.spec.ts` (add `import { parse } from '../../shared/chordpro';` and `import { linesFingerprint } from '../../shared/pauses';`). The suite is serial and earlier tests save `stella_del_mattino.cho`, so the fingerprint is computed from the file as it is on disk at test time:

```ts
test('pauses: add from the menu, edit the seconds, written as x_pause', async ({ page }) => {
	await goto(page, '/new?category=reparto');
	await page.getByTestId('meta-title').fill('Canzone con pausa');
	await page.getByTestId('add-line-end').click();
	await page.getByTestId('add-pause').click();
	await expect(page.getByTestId('pause-seconds')).toHaveValue('4');
	await page.getByTestId('pause-seconds').fill('7');

	await page.getByTestId('tab-raw').click();
	expect(await page.getByTestId('raw-editor').inputValue()).toContain('{x_pause:7}');
	await page.getByTestId('tab-visual').click();
	await expect(page.getByTestId('pause-seconds')).toHaveValue('7');
});

test('pauses: a proposal link is applied, a stale or malformed one is not', async ({ page }) => {
	const file = path.join(TMP, 'varie', 'stella_del_mattino.cho');
	const before = fs.readFileSync(file, 'utf-8');
	const fp = linesFingerprint(parse(before));

	await goto(page, `/edit/varie/stella_del_mattino.cho?pauses=1:6&fp=${fp}`);
	await expect(page.getByTestId('pause-import')).toBeVisible();
	await expect(page.getByTestId('pause-line')).toHaveCount(1);
	await expect(page.getByTestId('pause-seconds')).toHaveValue('6');
	await page.getByTestId('tab-raw').click();
	expect(await page.getByTestId('raw-editor').inputValue()).toMatch(/settembre\n\{x_pause:6\}/);
	expect(fs.readFileSync(file, 'utf-8')).toBe(before); // nothing written until save

	await goto(page, '/edit/varie/stella_del_mattino.cho?pauses=1:6&fp=deadbeef');
	await expect(page.getByTestId('pause-import-error')).toBeVisible();
	await expect(page.getByTestId('pause-line')).toHaveCount(0);

	await goto(page, `/edit/varie/stella_del_mattino.cho?pauses=abc&fp=${fp}`);
	await expect(page.getByTestId('pause-line')).toHaveCount(0);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd editor && npx playwright test -g "pauses:"`
Expected: FAIL — no `add-pause` / `pause-line`.

- [ ] **Step 3: SongEditor** — `{:else if line.type === 'pause'}` branch with the pill and `bind:value={line.seconds}` (clamp 1..60 on change); add the `lineTypes` entry. Deletion uses the existing ✕ tool.

- [ ] **Step 4: Edit route import** — client-side, after `content` is resolved (queued version or repo version): read `pauses` and `fp` from `page.url.searchParams`; if `pauses` present: if `fp === linesFingerprint(parse(content))` → `content = serialize(withPauses(parse(content), decodePauses(pauses)))` and show the `pause-import` notice ("Tempi proposti dal reader: controlla e salva."); else show `pause-import-error` ("La canzone è cambiata: impara di nuovo i tempi sul reader aggiornato."), content untouched. Nothing is queued or written until save.

- [ ] **Step 5: Run the editor suite**

Run: `cd editor && npm test && npm run check`
Expected: all tests pass, 0 errors.

- [ ] **Step 6: Online build and printer smoke test**

Run: `cd editor && VITE_ONLINE=1 BASE_PATH=/canzoniere/editor npm run build`, then temporarily add `{x_pause:5}` to one song of `canzonieri/chiusura_2026.txt` and run `go run ./printer -input canzonieri/chiusura_2026.txt -output "$TMPDIR/pause-check.pdf"`; revert the song.
Expected: both succeed and the PDF has no "x_pause" text (printer skips `{...}` lines).

- [ ] **Step 7: Commit**

```bash
git add editor/src/lib/components/SongEditor.svelte "editor/src/routes/edit/[category]/[file]/+page.svelte" editor/e2e/songbook.spec.ts AGENTS.md
git commit -m "L'editor mostra le pause e importa i tempi proposti dal reader"
```
