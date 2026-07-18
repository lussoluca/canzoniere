# AGENTS.md

Detailed project architecture is described in [ARCHITECTURE.md](ARCHITECTURE.md).

## Repository layout

- `canzoni/<category>/*.cho` — the songs, in ChordPro format. Categories are the directories under `canzoni/`; they are managed from the editor (create/rename/delete) and the historical set is `branco`, `canti_scout`, `chiesa`, `clan`, `reparto`, `varie`. Every song carries a `{tag:...}` directive that mirrors its category label (e.g. `canti_scout` → `{tag:Canti scout}`); the PDF table of contents groups songs by this tag.
- `canzonieri/*.txt` — event songbooks: one song per line as a path relative to `canzoni/` (e.g. `chiesa/tu_sei.cho`), `#` lines are comments, order matters.
- `printer/` — Go tool that renders an event songbook `.txt` into a lyrics-only PDF (from the repo root: `go run ./printer -input canzonieri/<name>.txt -output canzonieri/<name>.pdf`; `-songs` defaults to `canzoni`).
- `editor/` — SvelteKit web app to manage songs and event songbooks (see below).
- `reader/` — SvelteKit static web app to read songs from a tablet/phone (search, transpose, simplify/hide chords, per-song prefs in localStorage). Songs and songbooks are bundled at build time via `import.meta.glob`; every page is prerendered and a service worker makes it work offline. Deployed by CI to GitHub Pages under `/canzoniere/app/`. Run: `cd reader && npm install && npm run dev`.
- `shared/` — modules used by both web apps: ChordPro parse/serialize (`chordpro.ts`), chord helpers (`chords.ts`: convert/sanitize/validate/simplify/transpose), category helpers (`categories.ts`), guitar chord diagrams (`diagrams.ts` + `chord-definitions.json` + `ChordDiagram.svelte`). The editor re-exports the TS modules from `editor/src/lib/`; the reader imports everything via the `$songlib` alias.

## Web editor

The `editor/` directory contains a SvelteKit (Svelte 5) app:

- Home lists the categories as folders; each category page lists its songs with search, delete, and "move to another category" (moving rewrites the `{tag:...}` to match).
- Categories section: create, rename, reorder and delete categories (the changes hit the filesystem). Renaming a category renames its directory and rewrites the `{tag:...}` of every song inside; deleting one asks for an existing target category and moves all its songs there before removing the empty directory. The order is persisted in `canzoni/.categories.json` (categories not listed there are appended alphabetically).
- Song editor: metadata form (title, artist, columns, category — the tag is derived from the category on save, never edited directly) plus two synced tabs:
  - visual editor — chords as pills above the lyrics: click a character to add a chord, click a pill to edit/remove it, drag a pill to move it; line tools to edit text (Enter commits, Esc discards), add/delete lines, chorus markers and comments;
  - ChordPro tab — raw source with syntax highlighting (metadata, chords, chorus markers, comments).
- Chord tools, available in both tabs: convert english chord names to latin (`Am` → `Lam`) and transpose all chords ±1 semitone.
- Canzonieri section: list/create/delete the event songbooks in `canzonieri/` and edit each one (add/remove/reorder songs, resolved to titles; saving writes the `.txt` in the format consumed by the Go tool).

Commands:

- Run: `cd editor && npm install && npm run dev` (or `make dev` from the repo root)
- E2E tests (Playwright, isolated in `editor/e2e/.tmp-songs` and `editor/e2e/.tmp-songbooks`, never touch real data): `cd editor && npm test`
- Env overrides: `SONGS_DIR` (default `../canzoni`), `SONGBOOKS_DIR` (default `../canzonieri`).

## Build the final PDF

The final PDF is built with `make build` and is available at `canzoniere.pdf`. It is generated from the ChordPro files in the repository using the ChordPro parser with the configuration in `chordpro.json`. The PDF is formatted for A4 paper size.

The build uses ChordPro with `--transcode=latin` and the configuration in `chordpro.json`.

## ChordPro Parser Notes

- Note names are in Latin format (`Do`, `Re`, `Mi`, `Fa`, `Sol`, `La`, `Si`).
- This setup rejects several slash chords such as `Do/Mi`, `Fa/Sol`, `Mi/Sol#`, `Sol/Si`, `Re/Fa#`, and `Fa/Do`.
- This setup also rejects some suffixes or chord variants that are not directly supported, for example `Re7sus2` and `Mi5`.
- When a chord is rejected by the current parser, the safest fix is to simplify it to a compatible base chord unless there is an explicit musical reason not to.
- If you need a non-musical text label, use ChordPro markup such as `{comment:...}` instead of square brackets.
