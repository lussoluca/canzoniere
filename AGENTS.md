# AGENTS.md

## Web editor

The `editor/` directory contains a SvelteKit (Svelte 5) app to manage the songs in `canzoni/`: list/search by category and tag, create/edit/delete songs, and a visual editor to place chords on lyrics (click a character to add a chord, click a pill to edit/remove it, drag a pill to move it). Saving writes standard ChordPro to `canzoni/<category>/<file>.cho`.

- Run: `cd editor && npm install && npm run dev`
- E2E tests (Playwright, isolated in `editor/e2e/.tmp-songs`): `cd editor && npm test`
- The songs directory can be overridden with the `SONGS_DIR` env var.

## Build the final PDF

The final PDF is built with `make build` and is available at `canzoniere.pdf`. It is generated from the ChordPro files in the repository using the ChordPro parser with the configuration in `chordpro.json`. The PDF is formatted for A4 paper size.

The build uses ChordPro with `--transcode=latin` and the configuration in `chordpro.json`.

## ChordPro Parser Notes

- Note names are in Latin format (`Do`, `Re`, `Mi`, `Fa`, `Sol`, `La`, `Si`).
- This setup rejects several slash chords such as `Do/Mi`, `Fa/Sol`, `Mi/Sol#`, `Sol/Si`, `Re/Fa#`, and `Fa/Do`.
- This setup also rejects some suffixes or chord variants that are not directly supported, for example `Re7sus2` and `Mi5`.
- When a chord is rejected by the current parser, the safest fix is to simplify it to a compatible base chord unless there is an explicit musical reason not to.
- If you need a non-musical text label, use ChordPro markup such as `{comment:...}` instead of square brackets.
