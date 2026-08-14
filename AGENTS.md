# AGENTS.md

Detailed project architecture is described in [ARCHITECTURE.md](ARCHITECTURE.md).

## Repository layout

- `canzoni/<category>/*.cho` — the songs, in ChordPro format. Categories are the directories under `canzoni/`; they are managed from the editor (create/rename/delete) and the historical set is `branco`, `canti_scout`, `chiesa`, `clan`, `reparto`, `varie`. Every song carries a `{tag:...}` directive that mirrors its category label (e.g. `canti_scout` → `{tag:Canti scout}`); the PDF table of contents groups songs by this tag. A song can also carry free-form search tags, one `{x_tag:...}` directive per tag (e.g. `{x_tag:omelia}`), edited from the song metadata form and searchable in the reader as `#omelia`.
- `canzonieri/*.txt` — event songbooks: one song per line as a path relative to `canzoni/` (e.g. `chiesa/tu_sei.cho`), `#` lines are comments, order matters.
- `printer/` — Go tool that renders an event songbook `.txt` into a lyrics-only PDF (from the repo root: `go run ./printer -input canzonieri/<name>.txt -output canzonieri/<name>.pdf`; `-songs` defaults to `canzoni`).
- `editor/` — SvelteKit web app to manage songs and event songbooks (see below).
- `reader/` — SvelteKit static web app to read songs from a tablet/phone (search — free text and `#tag` tokens can be mixed, typing `#` opens the tag suggestions —, transpose, simplify/hide chords, per-song prefs in localStorage). Songs and songbooks are bundled at build time via `import.meta.glob`; every page is prerendered and a service worker makes it work offline. Deployed by CI to GitHub Pages under `/canzoniere/app/`. Run: `cd reader && npm install && npm run dev`.
- `shared/` — modules used by both web apps: ChordPro parse/serialize (`chordpro.ts`), chord helpers (`chords.ts`: convert/sanitize/validate/simplify/transpose), category helpers (`categories.ts`), tag normalization (`tags.ts`), guitar chord diagrams (`diagrams.ts` + `chord-definitions.json` + `ChordDiagram.svelte`). The editor re-exports the TS modules from `editor/src/lib/`; the reader imports everything via the `$songlib` alias.

## Web editor

The `editor/` directory contains a SvelteKit (Svelte 5) app:

- Home lists the categories as folders; each category page lists its songs with search, delete, and "move to another category" (moving rewrites the `{tag:...}` to match).
- Categories section: create, rename, reorder and delete categories (the changes hit the filesystem). Renaming a category renames its directory and rewrites the `{tag:...}` of every song inside; deleting one asks for an existing target category and moves all its songs there before removing the empty directory. The order is persisted in `canzoni/.categories.json` (categories not listed there are appended alphabetically).
- Song editor: metadata form (title, artist, columns, category — the tag is derived from the category on save, never edited directly — and free-form search tags with autocomplete on the tags already used across the repertoire) plus two synced tabs:
  - visual editor — chords as pills above the lyrics: click a character to add a chord, click a pill to edit/remove it, drag a pill to move it; line tools to edit text (Enter commits, Esc discards), add/delete lines, chorus markers and comments;
  - ChordPro tab — raw source with syntax highlighting (metadata, chords, chorus markers, comments).
- Chord tools, available in both tabs: convert english chord names to latin (`Am` → `Lam`) and transpose all chords ±1 semitone.
- Canzonieri section: list/create/delete the event songbooks in `canzonieri/` and edit each one (add/remove/reorder songs, resolved to titles; saving writes the `.txt` in the format consumed by the Go tool).

Commands:

- Run: `cd editor && npm install && npm run dev` (or `make dev` from the repo root)
- E2E tests (Playwright, isolated in `editor/e2e/.tmp-songs` and `editor/e2e/.tmp-songbooks`, never touch real data): `cd editor && npm test`
- Env overrides: `SONGS_DIR` (default `../canzoni`), `SONGBOOKS_DIR` (default `../canzonieri`).

## Web reader

Map of `reader/src/`, so the layout does not have to be rediscovered on every task. Keep it in sync when routes or lib modules are added or renamed.

Routes (`src/routes/`, every page prerendered, `trailingSlash: 'always'` from `+layout.ts`):

- `+layout.svelte` — header with the brand, `HeaderMenu`, the service-worker registration and update banner, and the theme CSS variables (`--bg`, `--text`, `--muted`, `--surface`, `--border`, `--control-border`, `--brand`, `--link`, `--active-bg`, `--active-text`, `--shadow`, …). Light is the default; dark is defined twice, once under `prefers-color-scheme` and once under `[data-theme='dark']` for the explicit toggle, and the two blocks must stay in sync.
- `+page.svelte` — home: search box and the category list.
- `c/[category]/` — songs of one category.
- `s/[category]/[slug]/` — the song sheet (transpose, chord display, per-song prefs).
- `k/[name]/` — an event songbook from `canzonieri/`.
- `raccolta/` — build a set list ("scaletta") in the browser and share it by link or QR.
- `accordi/` — "Cosa posso suonare": pick the chords you know, get the playable songs.
- `impara/` — "Impara la chitarra": guitar primer with diagrams, chord builder and fretboard map.
- `crediti/` — credits and rights notice.

Modules (`src/lib/`): `data.ts` (songs and songbooks bundled via `import.meta.glob`, plus `allSongs`/`categories`/`findSong`), `search.ts`, `prefs.ts`, `favorites.ts`, `theme.ts`, `feedback.ts` (`mailto:` builder for `canzoniere@alessandriascout.it`), `collection.ts` (set lists encoded into the URL) and `saved-collections.ts` (the sets kept on the device, both the ones built in-app and the ones received by link/QR, listed in the menu under "Scalette temporanee"), `known-chords.ts`, `chord-tutorial.ts`, `chord-listener.ts`, `harmony.ts`, `notes.ts`, `chroma.ts`.

Components (`src/lib/components/`): `HeaderMenu.svelte` (the `items` array is the single source of the menu entries, rendered both inline and in the drawer), `SearchBox`, `SongSheet`, `ChordBuilder`, `ChordChecker`, `ChordTutorialCard`, `FretboardMap`, `QrScanner`.

Conventions for a static page: `<svelte:head><title>… — Canzoniere Alessandria 2</title></svelte:head>`, then `<nav><a href="{base}/">← Canzoniere</a></nav>`, an `<h1>`, a `<p class="intro">` and uppercase `<h2>` section headings; links always built from `base` (`$app/paths`). Styles stay local to the component and take colours from the CSS variables only, never hardcoded, so both themes work. All user-facing text is in Italian.

## Build the final PDF

The final PDF is built with `make build` and is available at `canzoniere.pdf`. It is generated from the ChordPro files in the repository using the ChordPro parser with the configuration in `chordpro.json`. The PDF is formatted for A4 paper size.

The build uses ChordPro with `--transcode=latin` and the configuration in `chordpro.json`.

## CI

Everything lives under `.github/`:

- `actions/test-stack/action.yml` — composite action with the whole test suite, so the workflows below share one definition: `npm ci` plus `npm run check` on `editor` and `reader`, the editor Playwright E2E tests, the reader production build, `go vet` and `go build` on `printer`, then a render of every `canzonieri/*.txt` to a throwaway PDF. Add a new check here, not in a single workflow.
- `workflows/build.yml` — on push to `main`: builds `canzoniere.pdf`, the reader and the event songbooks, generates `index.html` with `site/generate.py` and deploys `public/` to GitHub Pages.
- `workflows/ci.yml` — runs `test-stack` on every pull request against `main`.
- `workflows/update-stack.yml` — daily at 04:00 UTC (and on demand): bumps the npm dependencies of `editor` and `reader` and the Go modules of `printer`, pushes the fixed branch `chore/aggiorna-stack`, opens or updates its pull request, runs `test-stack` on that branch and squash-merges only if the suite is green. The npm bump goes through `npm-check-updates -u --peer` so the target versions stay inside the peer ranges declared by the installed packages: without it TypeScript jumps to a major that `@sveltejs/kit` and `svelte-check` reject, and `npm install` dies on ERESOLVE. The tests run inside this workflow rather than as pull request checks because a pull request opened with `GITHUB_TOKEN` does not trigger the `pull_request` event, so an auto-merge would wait forever for checks that never start.
- `dependabot.yml` — weekly bumps of the action versions, which `update-stack.yml` does not touch. The `github-actions` ecosystem only scans `.github/workflows` from `/`, so `actions/test-stack` is listed as a second directory.

The scheduled workflow needs "Allow GitHub Actions to create and approve pull requests" enabled in Settings → Actions → General, otherwise `gh pr create` fails.

## ChordPro Parser Notes

- Note names are in Latin format (`Do`, `Re`, `Mi`, `Fa`, `Sol`, `La`, `Si`).
- This setup rejects several slash chords such as `Do/Mi`, `Fa/Sol`, `Mi/Sol#`, `Sol/Si`, `Re/Fa#`, and `Fa/Do`.
- This setup also rejects some suffixes or chord variants that are not directly supported, for example `Re7sus2` and `Mi5`.
- When a chord is rejected by the current parser, the safest fix is to simplify it to a compatible base chord unless there is an explicit musical reason not to.
- If you need a non-musical text label, use ChordPro markup such as `{comment:...}` instead of square brackets.
