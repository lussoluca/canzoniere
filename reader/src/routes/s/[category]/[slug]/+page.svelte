<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { parse } from '$songlib/chordpro';
	import { categoryLabel } from '$songlib/categories';
	import { simplifyChord, transposeChord } from '$songlib/chords';
	import ChordDiagram from '$songlib/ChordDiagram.svelte';
	import { findSongbook } from '$lib/data';
	import { loadNote, saveNote } from '$lib/notes';
	import SongSheet from '$lib/components/SongSheet.svelte';
	import {
		loadSongPrefs,
		saveSongPrefs,
		loadFontSize,
		saveFontSize,
		FONT_MIN,
		FONT_MAX,
		FONT_DEFAULT
	} from '$lib/prefs';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const song = $derived(parse(data.song.source));

	// Reading context: opened from a songbook (?from=name) or from its category.
	// The query string only exists client-side (pages are prerendered without it).
	const book = $derived.by(() => {
		if (!browser) return undefined;
		const name = page.url.searchParams.get('from');
		return name ? findSongbook(name) : undefined;
	});
	const bookIndex = $derived(
		book ? book.songs.findIndex((s) => s.category === data.song.category && s.slug === data.song.slug) : -1
	);
	const prev = $derived(book && bookIndex > 0 ? book.songs[bookIndex - 1] : undefined);
	const next = $derived(
		book && bookIndex >= 0 && bookIndex < book.songs.length - 1 ? book.songs[bookIndex + 1] : undefined
	);

	let transpose = $state(0);
	let simplify = $state(false);
	let hideChords = $state(false);
	let fontSize = $state(FONT_DEFAULT);
	let ready = $state(false);

	// Prefs are per song: reload whenever the song changes (client-side nav).
	$effect(() => {
		const p = loadSongPrefs(data.song.category, data.song.slug);
		transpose = p.transpose;
		simplify = p.simplify;
		hideChords = p.hideChords;
		ready = true;
	});

	$effect(() => {
		if (!ready) return;
		saveSongPrefs(data.song.category, data.song.slug, { transpose, simplify, hideChords });
	});

	onMount(() => {
		fontSize = loadFontSize();
	});

	$effect(() => {
		saveFontSize(fontSize);
	});

	// Keep the screen awake while a song is open (music-stand use).
	onMount(() => {
		let lock: WakeLockSentinel | null = null;
		const request = async () => {
			try {
				lock = (await navigator.wakeLock?.request('screen')) ?? null;
			} catch {
				// unsupported or denied: not essential
			}
		};
		const onVisible = () => {
			if (document.visibilityState === 'visible') request();
		};
		request();
		document.addEventListener('visibilitychange', onVisible);
		return () => {
			document.removeEventListener('visibilitychange', onVisible);
			lock?.release().catch(() => {});
		};
	});

	function bumpTranspose(delta: number) {
		transpose = ((transpose + delta + 18) % 12) - 6; // keep in [-6, +5]
	}

	let showDiagrams = $state(false);

	// Per-song note: reload on song change, save while typing.
	let note = $state('');
	let showNote = $state(false);
	let noteReady = $state(false);
	$effect(() => {
		note = loadNote(data.song.category, data.song.slug);
		showNote = false;
		noteReady = true;
	});
	$effect(() => {
		if (!noteReady) return;
		saveNote(data.song.category, data.song.slug, note);
	});
	const hasNote = $derived(note.trim() !== '');

	// Unique chords in order of first appearance, shown as the reader sees them
	// (simplified first, then transposed — same as SongSheet).
	const uniqueChords = $derived.by(() => {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const line of song.lines) {
			if (line.type !== 'lyric') continue;
			for (const c of line.chords) {
				let name = c.chord;
				if (simplify) name = simplifyChord(name);
				if (transpose !== 0) name = transposeChord(name, transpose);
				if (!seen.has(name)) {
					seen.add(name);
					out.push(name);
				}
			}
		}
		return out;
	});
</script>

<svelte:head>
	<title>{data.song.title} — Canzoniere</title>
</svelte:head>

<nav>
	{#if book}
		<a href="{base}/k/{book.name}/">← {book.label}</a>
	{:else}
		<a href="{base}/c/{data.song.category}/">← {categoryLabel(data.song.category)}</a>
	{/if}
</nav>

<h1>{data.song.title}</h1>
{#if data.song.artist}<p class="artist">{data.song.artist}</p>{/if}

<div class="controls">
	<div class="group" aria-label="Trasposizione">
		<button onclick={() => bumpTranspose(-1)} aria-label="Trasponi un semitono in giù">−</button>
		<button class="value" class:active={transpose !== 0} onclick={() => (transpose = 0)}
			title="Azzera trasposizione">{transpose > 0 ? `+${transpose}` : transpose}</button>
		<button onclick={() => bumpTranspose(1)} aria-label="Trasponi un semitono in su">+</button>
	</div>

	<button class="toggle" class:active={simplify} onclick={() => (simplify = !simplify)}>
		Accordi semplici
	</button>

	<button class="toggle" class:active={hideChords} onclick={() => (hideChords = !hideChords)}>
		Solo testo
	</button>

	{#if uniqueChords.length > 0}
		<button class="toggle" class:active={showDiagrams} onclick={() => (showDiagrams = !showDiagrams)}>
			Diagrammi
		</button>
	{/if}

	<div class="group" aria-label="Dimensione testo">
		<button onclick={() => (fontSize = Math.max(FONT_MIN, fontSize - 1))} aria-label="Testo più piccolo">A−</button>
		<button onclick={() => (fontSize = Math.min(FONT_MAX, fontSize + 1))} aria-label="Testo più grande">A+</button>
	</div>

	<button class="toggle" class:active={showNote} onclick={() => (showNote = !showNote)}>
		{hasNote ? '📝 Note' : 'Note'}
	</button>
</div>

<SongSheet {song} {transpose} {simplify} {hideChords} {fontSize} />

{#if showDiagrams}
	<div class="diagrams" role="dialog" aria-label="Diagrammi degli accordi">
		<div class="diagrams-head">
			<span>Accordi del canto</span>
			<button class="close" onclick={() => (showDiagrams = false)} aria-label="Chiudi i diagrammi">
				✕
			</button>
		</div>
		<div class="diagrams-grid">
			{#each uniqueChords as chord (chord)}
				<ChordDiagram name={chord} scale={2} />
			{/each}
		</div>
	</div>
{/if}

{#if showNote}
	<div class="note-sheet" role="dialog" aria-label="Note sul canto">
		<div class="note-head">
			<span>Note sul canto</span>
			<button class="close" onclick={() => (showNote = false)} aria-label="Chiudi le note">✕</button>
		</div>
		<!-- svelte-ignore a11y_autofocus -->
		<textarea
			bind:value={note}
			rows="5"
			placeholder="Intro, chi canta cosa, pennata… le note restano su questo dispositivo."
			autofocus={!hasNote}
		></textarea>
	</div>
{/if}

{#if book}
	<div class="pager">
		{#if prev}
			<a href="{base}/s/{prev.category}/{prev.slug}/?from={book.name}">← {prev.title}</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a class="next" href="{base}/s/{next.category}/{next.slug}/?from={book.name}">{next.title} →</a>
		{/if}
	</div>
{/if}

<style>
	nav {
		margin-bottom: 8px;
	}

	nav a {
		text-decoration: none;
		font-size: 15px;
	}

	h1 {
		font-size: 24px;
		margin: 0;
	}

	.artist {
		margin: 2px 0 0;
		color: var(--muted);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 14px 0 18px;
		position: sticky;
		top: calc(env(safe-area-inset-top) + 42px);
		z-index: 5;
		background: var(--bg);
		padding: 6px 0;
	}

	button {
		font: inherit;
		font-size: 15px;
		padding: 8px 14px;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	button.active {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	.group {
		display: flex;
	}

	.group button {
		border-radius: 0;
		margin-left: -1px;
	}

	.group button:first-child {
		border-radius: 8px 0 0 8px;
		margin-left: 0;
	}

	.group button:last-child {
		border-radius: 0 8px 8px 0;
	}

	.value {
		min-width: 44px;
		font-variant-numeric: tabular-nums;
	}

	/* Bottom sheet: song text stays visible and scrollable above it. */
	.note-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		padding: 0 16px calc(env(safe-area-inset-bottom) + 12px);
	}

	.note-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 10px 0 6px;
		font-weight: 600;
	}

	.note-sheet textarea {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		font-size: 15px;
		padding: 10px 12px;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		background: var(--bg);
		color: inherit;
		resize: vertical;
	}

	.diagrams {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		max-height: 45dvh;
		overflow-y: auto;
		padding: 0 calc(env(safe-area-inset-right) + 16px) calc(env(safe-area-inset-bottom) + 12px)
			calc(env(safe-area-inset-left) + 16px);
	}

	.diagrams-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		background: var(--surface);
		padding: 10px 0 6px;
		font-weight: 600;
	}

	.close {
		padding: 6px 12px;
	}

	.diagrams-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 18px;
		justify-content: center;
	}

	.pager {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		margin-top: 28px;
		border-top: 1px solid var(--border);
		padding-top: 14px;
	}

	.pager a {
		text-decoration: none;
		font-weight: 500;
	}

	.pager .next {
		text-align: right;
		margin-left: auto;
	}

	/* Landscape on a phone: the header is hidden by the layout, the controls
	   stick to the very top and shrink to give the song every possible line. */
	@media (orientation: landscape) and (max-height: 500px) {
		h1 {
			font-size: 20px;
		}

		.controls {
			top: 0;
			margin: 8px 0 10px;
		}

		button {
			font-size: 14px;
			padding: 5px 10px;
		}
	}
</style>
