<script lang="ts">
	import type { Song, Line, Chord } from '$songlib/chordpro';
	import { simplifyChord, transposeChord } from '$songlib/chords';

	interface Props {
		song: Song;
		transpose?: number;
		simplify?: boolean;
		hideChords?: boolean;
		fontSize?: number;
	}

	let { song, transpose = 0, simplify = false, hideChords = false, fontSize = 16 }: Props = $props();

	function transform(chord: string): string {
		let out = chord;
		if (simplify) out = simplifyChord(out);
		if (transpose !== 0) out = transposeChord(out, transpose);
		return out;
	}

	// A chord row is rendered as a monospace line above the lyrics; each chord is
	// placed at its character position, pushed right when it would overlap the
	// previous one.
	function chordRow(chords: Chord[]): string {
		const sorted = [...chords].sort((a, b) => a.pos - b.pos);
		let row = '';
		for (const c of sorted) {
			if (row.length < c.pos) row += ' '.repeat(c.pos - row.length);
			else if (row.length > 0) row += ' ';
			row += transform(c.chord);
		}
		return row;
	}

	type DisplayLine = Line & { chorus: boolean };

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
			out.push({ ...line, chorus });
		}
		return out;
	});
</script>

<div class="sheet" style="font-size: {fontSize}px">
	{#each displayLines as line}
		{#if line.type === 'lyric'}
			<div class="line" class:chorus={line.chorus}>
				{#if !hideChords && line.chords.length > 0}
					<pre class="chords">{chordRow(line.chords)}</pre>
				{/if}
				{#if line.text.trim() !== ''}
					<pre class="text">{line.text}</pre>
				{/if}
			</div>
		{:else if line.type === 'comment'}
			<p class="comment">{line.text}</p>
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
		color: #a15c07;
		font-weight: 700;
	}

	.chorus {
		border-left: 3px solid #d9c58a;
		padding-left: 10px;
		font-style: italic;
	}

	.comment {
		margin: 6px 0;
		color: #6b7280;
		font-style: italic;
	}

	.gap {
		height: 1.1em;
	}
</style>
