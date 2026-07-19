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
	import SongSheet from '$lib/components/SongSheet.svelte';
	import {
		loadSongPrefs,
		saveSongPrefs,
		loadFontSize,
		saveFontSize,
		FONT_MIN,
		FONT_MAX,
		FONT_DEFAULT,
		CAPO_MAX
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
	let capo = $state(0);
	let fontSize = $state(FONT_DEFAULT);
	let ready = $state(false);

	// Prefs are per song: reload whenever the song changes (client-side nav).
	$effect(() => {
		const p = loadSongPrefs(data.song.category, data.song.slug);
		transpose = p.transpose;
		simplify = p.simplify;
		hideChords = p.hideChords;
		capo = p.capo;
		ready = true;
	});

	$effect(() => {
		if (!ready) return;
		saveSongPrefs(data.song.category, data.song.slug, { transpose, simplify, hideChords, capo });
	});

	// Transpose moves the sung key; the capo lowers the written shapes by as
	// many semitones so the sounding key stays the one the group sings in.
	const chordShift = $derived(transpose - capo);

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

	// Unique chords in order of first appearance, shown as the reader sees them
	// (simplified first, then shifted by transpose and capo — same as SongSheet).
	const uniqueChords = $derived.by(() => {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const line of song.lines) {
			if (line.type !== 'lyric') continue;
			for (const c of line.chords) {
				let name = c.chord;
				if (simplify) name = simplifyChord(name);
				if (chordShift !== 0) name = transposeChord(name, chordShift);
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

	<div class="group" aria-label="Capotasto">
		<button onclick={() => (capo = Math.max(0, capo - 1))} aria-label="Capotasto un tasto in giù">−</button>
		<button class="value" class:active={capo !== 0} onclick={() => (capo = 0)}
			title="Togli il capotasto">Capo {capo}</button>
		<button onclick={() => (capo = Math.min(CAPO_MAX, capo + 1))} aria-label="Capotasto un tasto in su">+</button>
	</div>

	<div class="group" aria-label="Dimensione testo">
		<button onclick={() => (fontSize = Math.max(FONT_MIN, fontSize - 1))} aria-label="Testo più piccolo">A−</button>
		<button onclick={() => (fontSize = Math.min(FONT_MAX, fontSize + 1))} aria-label="Testo più grande">A+</button>
	</div>
</div>

{#if capo > 0 && !hideChords}
	<p class="capo-hint">
		🎸 Capotasto al tasto {capo}: gli accordi sono già scritti per suonare con il capo.
	</p>
{/if}

<SongSheet {song} transpose={chordShift} {simplify} {hideChords} {fontSize} />

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
		color: #6b7280;
	}

	.capo-hint {
		margin: 0 0 12px;
		font-size: 14px;
		color: #92610a;
		background: #fdf3d7;
		border: 1px solid #ecd9a0;
		border-radius: 8px;
		padding: 8px 12px;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 14px 0 18px;
		position: sticky;
		top: calc(env(safe-area-inset-top) + 42px);
		z-index: 5;
		background: #f6f4ee;
		padding: 6px 0;
	}

	button {
		font: inherit;
		font-size: 15px;
		padding: 8px 14px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background: white;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	button.active {
		background: #2f3e46;
		border-color: #2f3e46;
		color: #ffd166;
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
	.diagrams {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		background: white;
		border-top: 1px solid #d1d5db;
		box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.12);
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
		background: white;
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
		border-top: 1px solid #e5e7eb;
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
