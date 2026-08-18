<script lang="ts">
	import type { Song, Line, Chord } from '$songlib/chordpro';
	import { simplifyChord, transposeChord } from '$songlib/chords';

	interface Props {
		song: Song;
		transpose?: number;
		simplify?: boolean;
		hideChords?: boolean;
		fontSize?: number;
		// Student mode: given a handler, every chord above the lyrics becomes a
		// button that opens its lesson.
		onchord?: (chord: string) => void;
	}

	let {
		song,
		transpose = 0,
		simplify = false,
		hideChords = false,
		fontSize = 16,
		onchord
	}: Props = $props();

	function transform(chord: string): string {
		let out = chord;
		if (simplify) out = simplifyChord(out);
		if (transpose !== 0) out = transposeChord(out, transpose);
		return out;
	}

	// A chord row is rendered as a monospace line above the lyrics; each chord is
	// placed at its character position, pushed right when it would overlap the
	// previous one. The row is kept as (padding, chord) pairs so that each chord
	// can become a button of its own without disturbing the alignment.
	interface ChordSegment {
		gap: string;
		chord: string;
	}

	function chordSegments(chords: Chord[]): ChordSegment[] {
		const sorted = [...chords].sort((a, b) => a.pos - b.pos);
		const out: ChordSegment[] = [];
		let width = 0;
		for (const c of sorted) {
			let gap = '';
			if (width < c.pos) gap = ' '.repeat(c.pos - width);
			else if (width > 0) gap = ' ';
			const chord = transform(c.chord);
			out.push({ gap, chord });
			width += gap.length + chord.length;
		}
		return out;
	}

	function rowWidth(segments: ChordSegment[]): number {
		return segments.reduce((n, s) => n + s.gap.length + s.chord.length, 0);
	}

	type DisplayLine = Line & { chorus: boolean; chordRow: ChordSegment[] };

	const displayLines: DisplayLine[] = $derived.by(() => {
		const out: DisplayLine[] = [];
		let chorus = false;
		for (const line of song.lines) {
			if (line.type === 'chorus_start') {
				chorus = true;
				continue;
			}
			if (line.type === 'chorus_end') {
				chorus = false;
				continue;
			}
			if (line.type === 'directive') continue;
			const row = line.type === 'lyric' && !hideChords ? chordSegments(line.chords) : [];
			out.push({ ...line, chorus, chordRow: row });
		}
		return out;
	});

	// Fit to width: the font shrinks (never grows) so the longest monospace row
	// of the song fits the sheet, down to a readability floor; beyond that the
	// horizontal scroll takes over. The user's A−/A+ size stays the upper bound.
	const CHAR_RATIO = 0.62; // monospace glyph width relative to the font size
	const FIT_FLOOR = 10;

	let sheetWidth = $state(0);

	const maxChars = $derived.by(() => {
		let max = 0;
		for (const line of displayLines) {
			if (line.type === 'lyric') {
				max = Math.max(max, line.text.length, rowWidth(line.chordRow));
			} else if (line.type === 'tab') {
				for (const row of line.text.split('\n')) max = Math.max(max, row.length);
			}
		}
		return max;
	});

	const effectiveSize = $derived.by(() => {
		if (sheetWidth === 0 || maxChars === 0) return fontSize;
		const fit = Math.floor(sheetWidth / (maxChars * CHAR_RATIO));
		return Math.max(FIT_FLOOR, Math.min(fontSize, fit));
	});
</script>

<div class="sheet" style="font-size: {effectiveSize}px" bind:clientWidth={sheetWidth}>
	{#each displayLines as line}
		{#if line.type === 'lyric'}
			<div class="line" class:chorus={line.chorus}>
				{#if line.chordRow.length > 0}
					<pre
						class="chords">{#each line.chordRow as seg, i (i)}{seg.gap}{#if onchord}<button class="chord" onclick={() => onchord?.(seg.chord)} title="Come si suona {seg.chord}">{seg.chord}</button>{:else}{seg.chord}{/if}{/each}</pre>
				{/if}
				{#if line.text.trim() !== ''}
					<pre class="text">{line.text}</pre>
				{/if}
			</div>
		{:else if line.type === 'comment'}
			<p class="comment">{line.text}</p>
		{:else if line.type === 'tab'}
			<pre class="tab" class:chorus={line.chorus}>{line.text}</pre>
		{:else if line.type === 'empty'}
			<div class="gap"></div>
		{/if}
	{/each}
</div>

<style>
	.sheet {
		font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
		line-height: 1.35;
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
	}

	pre {
		margin: 0;
		font: inherit;
		white-space: pre;
	}

	.line {
		padding: 1px 0;
	}

	.chords {
		color: var(--chord);
		font-weight: 700;
	}

	/* Student mode: the chord keeps its place in the monospace grid, the dotted
	   underline is the only hint that it can be tapped. */
	.chord {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		text-decoration: underline dotted;
		text-underline-offset: 2px;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.chord:active {
		color: var(--link);
	}

	.chorus {
		border-left: 3px solid var(--chorus);
		padding-left: 10px;
		font-style: italic;
	}

	.comment {
		margin: 6px 0;
		color: var(--muted);
		font-style: italic;
	}

	.tab {
		margin: 6px 0;
		padding: 1px 0;
	}

	.gap {
		height: 1.1em;
	}
</style>
