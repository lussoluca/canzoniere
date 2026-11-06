# Autoscroll pauses learned by playing

## Intent

The reader's autoscroll moves at one constant speed per song (`{x_scroll:N}`,
8 px/s per level). The average speed is fine, but real songs stop or repeat:
a chorus played twice ("(2 volte)"), an intro or an instrumental break written
as a line of bare chords. In those spots the text keeps moving while the music
stays put, so the guitarist has to touch the phone mid-song and drag the page
back. The goal is an autoscroll that waits at those spots, so a whole song can
be played without touching the screen.

The guitarist only notices where the song needs to wait by playing it, so the
timing is not typed in: it is learned from the corrections the guitarist
already makes today (dragging back, holding a finger on the page), and only
while an explicit "Impara i tempi" mode is on. The timing learned on a phone
can then be proposed for the official songbook, through the online editor and
its password-protected pull request flow.

Prior art in the repo the design builds on: the per-song prefs in
`reader/src/lib/prefs.ts`, the autoscroll loop in
`reader/src/routes/s/[category]/[slug]/+page.svelte`, the `{x_scroll:N}`
directive in `shared/chordpro.ts`, the online editor's pending queue
(`editor/src/lib/pending.svelte.ts`) and `/invia` page.

## Goals

- Per-line pauses: "when this line is reached, hold the scroll for N seconds,
  then resume at the normal speed".
- Learn mode in the reader ("Impara i tempi", off by default): while on and
  the autoscroll runs, the guitarist's corrections turn into pauses on the
  line where they happen.
- Pauses learned on a device are saved on that device, per song, like the
  other song prefs, and can be reset ("Azzera tempi").
- Official pauses live in the `.cho` and apply to everyone.
- From the reader, the device's pauses can be proposed for the official song:
  this opens the song in the online editor with the pauses applied; saving
  and sending go through the existing queue and `/invia` with the editor
  password. Only people with the editor password can get them into the repo.
- The editor shows pauses on their line in the visual editor, editable and
  removable.

## Non-goals

- Continuous speed changes (accelerating/slowing curves, the "sinusoid"). The
  pain is in stops and repeats; pauses cover it. Speed stays one value per
  song.
- Detecting repeats automatically from the text ("(2 volte)", chord-only
  lines).
- Syncing with audio or the microphone.
- Timings per songbook or per set list; set list links (`collection.ts`) do
  not carry pauses.
- Typing pauses as numbers as the primary input. The editor allows editing
  the number, but the source of truth is playing.

## Anti-goals

- Learning from casual scrolling: nothing is learned unless "Impara i tempi"
  is explicitly on.
- A reader that looks or behaves differently for people who do not use the
  feature: with no pauses in the `.cho` and none on the device, the autoscroll
  behaves exactly as today.
- Jerky, unpredictable motion: a pause is a clean stop and a clean restart at
  the song's speed.
- The editor password ever reaching the reader.

## Decisions

### Unit: lines and seconds, never pixels

A pause is attached to a line and measured in seconds. The same song has
different heights on phone vs tablet and at different font sizes, so pixel
positions do not transfer between devices; a line does. Seconds are musical
time, so a pause stays right if the guitarist changes the scroll speed.

### File format

One directive per pause, on its own line, right after the line the scroll
waits on:

```
[Re]Danza la [Sol]vita al [La]ritmo dello [Re]spirito
{x_pause:8}
```

- Value: seconds, a positive integer. (My call: whole seconds are precise
  enough for a held scroll and keep the file readable.)
- `x_` directives are ignored by the ChordPro CLI and by `printer/` (it skips
  every `{...}` line), so the PDFs do not change.
- Placing it after its line keeps the pause attached to the right line when
  text around it is edited; a single list of positions in the header would
  break on the first edit.
- `shared/chordpro.ts` parses it into its own line type (e.g.
  `{ type: 'pause'; seconds: number }`) and serializes it back, so both apps
  handle it explicitly instead of as an opaque `directive`.

### Which line a pause belongs to (reader)

A pause belongs to the nearest preceding rendered line (lyric, comment or
tab). The reader triggers the pause when that line reaches the reading point
and then holds. The reading point is the same one used for learning (below),
so learning and playback agree. Its exact position (e.g. the top edge just
below the sticky controls, or some fraction down the viewport) is left to the
builder, to be tuned by trying it on a real phone with a real song.

### Learning (reader, only in "Impara i tempi")

While learn mode is on and the autoscroll is running:

- **Drag back**: when a touch ends with the page moved up by D px, add
  D ÷ (current speed in px/s) seconds to the pause of the line at the reading
  point after the drag.
- **Hold**: a finger held on the page already pauses the motion; in learn
  mode the held time (if the page did not move meaningfully) is added to the
  pause of the line at the reading point. (My call: it is the same correction
  expressed differently.)
- **Drag forward**: reduces the pause of the nearest paused line at or before
  the reading point, by the same conversion, never below zero.

Values are rounded to whole seconds when saved. Tiny corrections below a
threshold (builder's choice, e.g. < 1 s) are ignored so a bump of the finger
does not create pauses.

Learn mode is a toggle next to the autoscroll controls, visibly "on" while
active, and it does not stay on by itself between songs (my call: it is a
rehearsal tool, not a setting).

### Storage and priority (reader)

- The official pauses come from the `.cho`.
- The device's learned pauses are stored in localStorage as the full
  resulting set of pauses for the song (official plus corrections), keyed by
  line index among the song's rendered lines. (My call: storing the full
  set, not a delta, makes "what the device plays" and "what gets proposed"
  the same thing.)
- They have their own storage key and save path, separate from the other
  song prefs, and are always saved in learn mode, including when the song is
  opened from a shared set list link (where the other prefs are not saved).
  (My call: a rehearsal from a set list must not lose what was learned.)
- Saved together with a fingerprint of the song's rendered lines, pause
  lines excluded, and with the official set of pauses they started from. The
  device's pauses are discarded, and the official ones apply again, when:
  - the fingerprint no longer matches (the lyrics changed, so the indices
    would land on the wrong lines);
  - the official pauses differ from the set they started from (the official
    timing was updated, e.g. a proposal was merged, and it is the newest
    agreed version).
  (My call on both.)
- "Azzera tempi" drops the device's pauses and goes back to the official
  ones. It shows only when the device has its own pauses.

### Proposing to the songbook

- In the reader, when the device's pauses differ from the official ones, a
  "Proponi questi tempi" action opens the online editor's page for that song
  (`/canzoniere/editor/edit/<category>/<file>/`) with the pauses in the query
  string together with the lines fingerprint (e.g.
  `?pauses=12:8,30:4&fp=<fingerprint>`, line index : seconds).
- The online editor, on load, computes the same fingerprint (shared code in
  `shared/`) on the version it is about to edit (the queued local version if
  the song is in the pending queue, otherwise the repo version).
  - Match: it removes the song's existing `{x_pause}` lines, inserts the
    proposed ones after the indexed lines and tells the user the pauses came
    from the reader. Nothing is queued until the user saves, as with any
    edit.
  - Mismatch (stale cached reader, or a queued edit that changed the lines):
    it applies nothing and shows a message that the song changed and the
    timing must be learned again on the updated song. (My call: pauses on
    the wrong lines must never reach a pull request.)
- From there the existing flow applies: save queues the song, `/invia` sends
  the batch with the editor password, a pull request is opened.
- The reader and the online editor are on the same GitHub Pages site, so the
  link is a plain relative URL in production; in dev the editor's base URL
  comes from an env var (builder's choice of name, alongside
  `VITE_API_BASE`).
- The action is visible to everyone who has learned pauses; the password
  check stays in the editor. (My call: the reader cannot know who has the
  password, and the editor already asks for it.)

### Editor

- Visual editor: a pause shows as a pill on its line ("⏸ 8s"), click to edit
  the seconds or remove it; the line tools gain "aggiungi pausa".
- ChordPro tab: `{x_pause:N}` is highlighted like other directives.
- Works in both local and online mode.

## Constraints

- All user-facing text in Italian.
- Reader: styles local to components, colours only from the theme CSS
  variables; links via `resolve(...)`.
- Reader is prerendered and offline: learning and storage are fully local.
- Keep `AGENTS.md` (reader map, file format notes) and the reader's
  documentation in sync.
- CI runs `test-stack`: editor E2E tests and `check` on both apps must pass;
  new editor behaviour (pause pill, query-string import) gets E2E coverage.

## Left to the builder

- Exact reading point and the pause trigger geometry (tune on a phone).
- Threshold for ignoring tiny corrections.
- Fingerprint method for the song's lines.
- Exact UI placement and icons for "Impara i tempi", "Azzera tempi",
  "Proponi questi tempi", within the existing controls bar.
- Whether pause seconds have an upper bound (sensible cap, e.g. 60 s).
