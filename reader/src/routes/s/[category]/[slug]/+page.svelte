<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/env';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parse } from '@canzoniere/shared/chordpro';
	import { categoryLabel } from '@canzoniere/shared/categories';
	import { simplifyChord, transposeChord } from '@canzoniere/shared/chords';
	import ChordDiagram from '@canzoniere/shared/ChordDiagram.svelte';
	import { findSongbook } from '#lib/data.js';
	import { decodeCollection, type CollectionSong } from '#lib/collection.js';
	import { isFavorite, toggleFavorite } from '#lib/favorites.js';
	import { loadNote, saveNote } from '#lib/notes.js';
	import { loadStudentMode } from '#lib/student.js';
	import {
		baseChord,
		chordChanges,
		loadKnownChords,
		readiness,
		saveKnownChords
	} from '#lib/known-chords.js';
	import SongSheet from '#lib/components/SongSheet.svelte';
	import ChordHelp from '#lib/components/ChordHelp.svelte';
	import StudyPanel from '#lib/components/StudyPanel.svelte';
	import {
		loadSongPrefs,
		saveSongPrefs,
		loadFontSize,
		saveFontSize,
		FONT_MIN,
		FONT_MAX,
		FONT_DEFAULT,
		SCROLL_MIN,
		SCROLL_MAX,
		SCROLL_DEFAULT,
		SCROLL_PX_PER_LEVEL,
		type SongPrefs
	} from '#lib/prefs.js';
	import {
		adjustPause,
		pausedLineAtOrBefore,
		samePauses,
		songPauses,
		type Pauses
	} from '@canzoniere/shared/pauses';
	import {
		clearDevicePauses,
		loadDevicePauses,
		proposalHref,
		saveDevicePauses
	} from '#lib/pauses.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const song = $derived(parse(data.song.source));

	// The song's authored autoscroll speed, clamped; the reader's per-song
	// default when the device has no saved override.
	const songScroll = $derived(
		song.meta.scroll
			? Math.min(SCROLL_MAX, Math.max(SCROLL_MIN, song.meta.scroll))
			: SCROLL_DEFAULT
	);

	// Reading context: opened from a preset songbook (?from=name) or from an
	// ad-hoc shared collection (?l=...&t=...). Either way it gives the song list
	// for the prev/next pager plus a back link and the query to carry forward.
	// The query string only exists client-side (pages are prerendered without it).
	interface Ctx {
		songs: CollectionSong[];
		backHref: string;
		backLabel: string;
		query: string;
	}
	const ctx = $derived.by((): Ctx | undefined => {
		if (!browser) return undefined;
		const params = page.url.searchParams;
		const name = params.get('from');
		if (name) {
			const b = findSongbook(name);

			if (b) return {
				songs: b.songs,
				backHref: resolve(`k/${b.name}/`),
				backLabel: b.label,
				query: `from=${name}`
			};
		}
		const l = params.get('l');
		if (l) {
			const songs = decodeCollection(l);
			if (songs.length > 0) {
				const t = params.get('t') ?? '';
				const query = `l=${encodeURIComponent(l)}${t ? `&t=${encodeURIComponent(t)}` : ''}`;

				return {
					songs,
					backHref: resolve(`raccolta/?${query}`),
					backLabel: t.trim() || 'Scaletta',
					query
				};
			}
		}
		return undefined;
	});
	const ctxIndex = $derived(
		ctx ? ctx.songs.findIndex((s) => s.category === data.song.category && s.slug === data.song.slug) : -1
	);
	const prev = $derived(ctx && ctxIndex > 0 ? ctx.songs[ctxIndex - 1] : undefined);
	const next = $derived(
		ctx && ctxIndex >= 0 && ctxIndex < ctx.songs.length - 1 ? ctx.songs[ctxIndex + 1] : undefined
	);

	let transpose = $state(0);
	let simplify = $state(false);
	let hideChords = $state(false);
	let scrollSpeed = $state(SCROLL_DEFAULT);
	let fontSize = $state(FONT_DEFAULT);
	// Size the sheet really renders: smaller than fontSize when the song is
	// shrunk to fit the screen width, so A+ seems to do nothing.
	let appliedSize = $state(FONT_DEFAULT);
	const fitted = $derived(appliedSize < fontSize);
	let ready = $state(false);

	// Autoscroll pauses: the song's official ones ({x_pause:N}), unless this
	// device has learned its own. Loaded per song and kept apart from the other
	// prefs, so a shared set list (which turns those off) does not affect them.
	const officialPauses = $derived(songPauses(song));
	let devicePauses = $state<Pauses | null>(null);
	const activePauses = $derived(devicePauses ?? officialPauses);
	$effect(() => {
		devicePauses = loadDevicePauses(data.song.category, data.song.slug, song);
		learning = false;
	});

	// "Impara i tempi": while on, the corrections made during the autoscroll
	// become pauses on the line being played. A rehearsal tool, so it turns off
	// whenever the song changes.
	let learning = $state(false);

	function learnPause(line: number | null, deltaSeconds: number) {
		if (line === null) return;
		const next = adjustPause(activePauses, line, deltaSeconds);
		devicePauses = next;
		saveDevicePauses(data.song.category, data.song.slug, song, next);
	}

	function resetPauses() {
		clearDevicePauses(data.song.category, data.song.slug);
		devicePauses = null;
	}

	// The timed line at the reading point: the last one whose top has reached
	// the bottom of the sticky controls, i.e. the line being played.
	function readingLine(): number | null {
		const controls = document.querySelector('.controls');
		const y = controls ? controls.getBoundingClientRect().bottom : 0;
		let found: number | null = null;
		for (const el of document.querySelectorAll<HTMLElement>('.sheet [data-line]')) {
			if (el.getBoundingClientRect().top > y + 1) break;
			found = Number(el.dataset.line);
		}
		return found;
	}

	// Prefs carried by a shared collection link (?l=...): the sender's
	// transpose, simplified chords and scroll speed for this song.
	const sharedPrefs = $derived(ctx && ctxIndex >= 0 ? ctx.songs[ctxIndex].prefs : undefined);

	// Prefs are per song: reload whenever the song changes (client-side nav).
	// Shared prefs override the local ones for the view but are never written
	// to this device's storage: the reader's own prefs survive a shared set.
	// While they differ from the local ones, saving stays off for this song
	// (when they match, e.g. the sender opening their own collection, it stays
	// on as usual).
	$effect(() => {
		const p = loadSongPrefs(data.song.category, data.song.slug, songScroll);
		const shared = sharedPrefs;
		const merged = { ...p, ...shared };
		transpose = merged.transpose;
		simplify = merged.simplify;
		hideChords = merged.hideChords;
		scrollSpeed = merged.scrollSpeed;
		scrolling = false;
		ready =
			!shared || (Object.keys(shared) as (keyof SongPrefs)[]).every((k) => shared[k] === p[k]);
	});

	$effect(() => {
		if (!ready) return;
		saveSongPrefs(
			data.song.category,
			data.song.slug,
			{ transpose, simplify, hideChords, scrollSpeed },
			songScroll
		);
	});

	// Autoscroll: the page scrolls by itself like a teleprompter, so the
	// guitarist never has to touch the screen mid-song. Each speed level is
	// worth SCROLL_PX_PER_LEVEL px/s; the level is saved per song with the other
	// prefs. On a line with a pause the motion holds for its seconds, once per run.
	// Turning it on first glides the page down to the top of the sheet (only
	// forward, so resuming mid-song never rewinds), then the steady scroll
	// begins. A finger on the page only pauses the motion while it is down:
	// the user can adjust the position without turning the autoscroll off.
	let scrolling = $state(false);

	$effect(() => {
		if (!scrolling) return;

		let raf = 0;
		let last: number | null = null;
		let carry = 0;
		let touching = false;
		// pauses: each paused line holds once per run, until holdUntil
		let holdUntil: number | null = null;
		const held = new Set<number>();

		// Initial glide: bring the top of the sheet just below the stuck
		// controls, so the song starts scrolling from its first line.
		let glide: { from: number; dist: number; ms: number; start: number | null } | null = null;
		const sheet = document.querySelector('.sheet');
		const controls = document.querySelector('.controls');
		if (sheet) {
			const stuckBottom = controls
				? parseFloat(getComputedStyle(controls).top) + controls.getBoundingClientRect().height
				: 0;
			const target = sheet.getBoundingClientRect().top + window.scrollY - stuckBottom;
			const dist = target - window.scrollY;
			if (dist > 4) glide = { from: window.scrollY, dist, ms: Math.min(1200, 300 + dist), start: null };
		}

		const step = (now: number) => {
			if (touching) {
				last = now;
				raf = requestAnimationFrame(step);
				return;
			}
			if (glide) {
				glide.start ??= now;
				const t = Math.min(1, (now - glide.start) / glide.ms);
				const ease = t < 0.5 ? 2 * t * t : 1 - (2 - 2 * t) ** 2 / 2;
				window.scrollTo(0, glide.from + glide.dist * ease);
				if (t >= 1) glide = null;
				last = now;
				raf = requestAnimationFrame(step);
				return;
			}
			if (holdUntil !== null && now < holdUntil) {
				last = now;
				raf = requestAnimationFrame(step);
				return;
			}
			holdUntil = null;
			const k = readingLine();
			if (k !== null && activePauses[k] && !held.has(k)) {
				held.add(k);
				holdUntil = now + activePauses[k] * 1000;
				last = now;
				raf = requestAnimationFrame(step);
				return;
			}
			if (last !== null) {
				carry += (now - last) / 1000 * scrollSpeed * SCROLL_PX_PER_LEVEL;
				const px = Math.trunc(carry);
				if (px > 0) {
					window.scrollBy(0, px);
					carry -= px;
				}
				if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1) {
					scrolling = false;
					return;
				}
			}
			last = now;
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);

		// A touch pauses the motion until the finger lifts; touch or wheel also
		// cancels the initial glide, since the user has taken over the position.
		// In learn mode a correction becomes a pause: dragging the page back by
		// some pixels, or holding it still, means the music was behind by that
		// much time; dragging it forward shortens the last pause passed. Small
		// bumps of the finger (under a second's worth) are ignored.
		let touchY = 0;
		let touchAt = 0;
		const onTouchStart = () => {
			touching = true;
			glide = null;
			touchY = window.scrollY;
			touchAt = performance.now();
		};
		const onTouchEnd = () => {
			touching = false;
			if (!learning) return;
			const pxs = scrollSpeed * SCROLL_PX_PER_LEVEL;
			const back = touchY - window.scrollY;
			const k = readingLine();
			let learned: number | null = null;
			if (Math.abs(back) < 10) {
				// only the time the page stood still because of the finger: the
				// part overlapping a pause already playing was no correction
				const heldSeconds = (performance.now() - Math.max(touchAt, holdUntil ?? 0)) / 1000;
				if (heldSeconds >= 1) learned = k;
				if (learned !== null) learnPause(learned, heldSeconds);
			} else if (back / pxs >= 1) {
				learned = k;
				learnPause(learned, back / pxs);
			} else if (-back / pxs >= 1 && k !== null) {
				learned = pausedLineAtOrBefore(activePauses, k);
				learnPause(learned, back / pxs);
			}
			// the correction itself already made up for this run's delay: the
			// new pause plays from the next run on
			if (learned !== null) held.add(learned);
		};
		const onWheel = () => {
			glide = null;
		};
		window.addEventListener('touchstart', onTouchStart, { passive: true });
		window.addEventListener('touchend', onTouchEnd, { passive: true });
		window.addEventListener('touchcancel', onTouchEnd, { passive: true });
		window.addEventListener('wheel', onWheel, { passive: true });

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchend', onTouchEnd);
			window.removeEventListener('touchcancel', onTouchEnd);
			window.removeEventListener('wheel', onWheel);
		};
	});

	function bumpScrollSpeed(delta: number) {
		scrollSpeed = Math.min(SCROLL_MAX, Math.max(SCROLL_MIN, scrollSpeed + delta));
	}

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
				lock = await navigator.wakeLock?.request('screen') ?? null;
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
		transpose = (transpose + delta + 18) % 12 - 6; // keep in [-6, +5]
	}

	let showDiagrams = $state(false);

	// Favorite star: reload whenever the song changes (client-side nav).
	let favorite = $state(false);
	$effect(() => {
		favorite = isFavorite(data.song.category, data.song.slug);
	});

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

	// Copilot for beginners: a fixed panel with the chords of the row being
	// read ("Ora", with their diagrams) and of the next one ("Poi"), synced
	// with the scroll position so it works while scrolling by hand or with the
	// autoscroll. Rows are read from the rendered sheet, so they already
	// reflect transpose and simplified chords.
	let copilot = $state(false);
	let nowChords = $state<string[]>([]);
	let nextChords = $state<string[]>([]);
	// Diagrams follow "Ora"; before the first chord row they show that row, so
	// the first chords can be prepared. A chord row can repeat a chord; one
	// diagram each is enough (also keeps the {#each} key unique).
	const diagramChords = $derived([...new Set(nowChords.length > 0 ? nowChords : nextChords)]);

	const READ_Y = 170; // viewport offset of the "reading line", below the sticky controls

	// Room below the sheet so the last row can reach the reading line and is
	// never hidden behind the panel.
	let viewportHeight = $state(0);
	let copilotHeight = $state(0);
	const copilotTail = $derived(Math.max(copilotHeight, viewportHeight - READ_Y));

	$effect(() => {
		if (!copilot) return;
		void uniqueChords; // re-sync when transpose/simplify re-render the sheet

		const update = () => {
			const lines = [...document.querySelectorAll('.sheet .line')].filter((l) =>
				l.querySelector('.chords')
			);
			let current: Element | null = null;
			let next: Element | null = null;
			for (const l of lines) {
				if (l.getBoundingClientRect().top <= READ_Y) current = l;
				else {
					next = l;
					break;
				}
			}
			for (const l of lines) l.classList.toggle('copilot-now', l === current);
			nowChords = current
				? (current.querySelector('.chords')?.textContent ?? '').trim().split(/\s+/)
				: [];
			nextChords = next
				? (next.querySelector('.chords')?.textContent ?? '').trim().split(/\s+/)
				: [];
		};

		update();
		let raf = 0;
		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(update);
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
			for (const l of document.querySelectorAll('.sheet .copilot-now, .sheet .line')) {
				l.classList.remove('copilot-now');
			}
			nowChords = [];
			nextChords = [];
		};
	});

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

	// Student mode: the song doubles as a lesson. The chords above the lyrics
	// become buttons, the "⋯" menu says what is still missing and the study
	// panel walks through the song with the tools of the guitar primer. All of it
	// is off, and invisible, unless the mode is on.
	let student = $state(false);
	let known = $state<string[]>([]);
	let knownReady = $state(false);
	let helpChord = $state<string | null>(null);
	let study = $state(false);

	onMount(() => {
		student = loadStudentMode();
		known = loadKnownChords();
		knownReady = true;
	});

	$effect(() => {
		if (!knownReady) return;
		saveKnownChords(known);
	});

	function learn(chord: string, on = true) {
		const base = baseChord(chord);
		if (on) known = known.includes(base) ? known : [...known, base];
		else known = known.filter((c) => c !== base);
	}

	// The song measured against the chords the reader can play, in the key they
	// are currently seeing.
	const progress = $derived(readiness(uniqueChords, known));

	// The chord changes of this song, in the reader's key, most frequent first.
	const changes = $derived(
		chordChanges(data.song.source, (c) => {
		let name = c;
		if (simplify) name = simplifyChord(name);
		if (transpose !== 0) name = transposeChord(name, transpose);
		return name;
		})
	);

	// Last step of the study panel: play the song for real, with the copilot on
	// and the page scrolling by itself.
	function playAlong() {
		study = false;
		copilot = true;
		scrolling = true;
	}

	// The two menus of the bar: "Aa" for how the song looks, "⋯" for the
	// occasional actions. One bottom panel at a time, never over the other
	// bottom sheets, and none while scrolling (their buttons are not there).
	let menu = $state<'view' | 'more' | null>(null);

	function openMenu(which: 'view' | 'more') {
		showNote = false;
		showDiagrams = false;
		menu = menu === which ? null : which;
	}

	$effect(() => {
		if (scrolling) menu = null;
	});

	$effect(() => {
		void data.song;
		menu = null;
	});

	// Simplified chords and lyrics only are one choice with three answers.
	type ChordMode = 'full' | 'simple' | 'none';
	const CHORD_MODES: [ChordMode, string][] = [
		['full', 'Completi'],
		['simple', 'Semplici'],
		['none', 'Nessuno']
	];
	const chordMode = $derived<ChordMode>(hideChords ? 'none' : simplify ? 'simple' : 'full');

	function setChordMode(mode: ChordMode) {
		simplify = mode === 'simple';
		hideChords = mode === 'none';
	}

	// A dot on "⋯" when it holds something of this song: a note, or learned
	// pauses not yet in the songbook.
	const moreBadge = $derived(
		hasNote || (devicePauses !== null && !samePauses(devicePauses, officialPauses))
	);
</script>

<svelte:window bind:innerHeight={viewportHeight} onkeydown={(e) => { if (e.key === 'Escape') menu = null; }} />

<svelte:head>
	<title>{data.song.title} — Canzoniere Alessandria 2</title>
</svelte:head>

<nav>
	{#if ctx}
		<a href={ctx.backHref}>← {ctx.backLabel}</a>
	{:else}
		<a href={resolve(`c/${data.song.category}/`)}>← {categoryLabel(data.song.category)}</a>
	{/if}
</nav>

<h1>
	{data.song.title}
	<button
		class="star"
		class:on={favorite}
		onclick={() => favorite = toggleFavorite(data.song.category, data.song.slug)}
		aria-label={favorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
		aria-pressed={favorite}
	>
		{favorite ? '★' : '☆'}
	</button>
</h1>
{#if data.song.artist}<p class="artist">{data.song.artist}</p>{/if}

<!-- A single row of fixed height in both states: a bar that grows or shrinks
     while scrolling makes the lyrics jump. Stopped, it holds the key and the
     two menus; scrolling, only what is needed mid-song. -->
<div class="controls">
	{#if scrolling}
		<button class="active" onclick={() => scrolling = false}>⏸ Ferma</button>

		<div class="group" aria-label="Velocità di scorrimento">
			<button onclick={() => bumpScrollSpeed(-1)} aria-label="Scorri più lentamente">−</button>
			<button class="value" aria-label="Velocità di scorrimento" disabled>{scrollSpeed}</button>
			<button onclick={() => bumpScrollSpeed(1)} aria-label="Scorri più velocemente">+</button>
		</div>

		{#if transpose !== 0}
			<span class="key" title="Trasposizione">{transpose > 0 ? `+${transpose}` : transpose}</span>
		{/if}

		<button
			class:active={learning}
			aria-pressed={learning}
			aria-label="Impara i tempi"
			onclick={() => learning = !learning}
			title="Mentre scorre, torna indietro o tieni fermo il testo dove la musica si ferma: il canto lo ricorda"
		>⏱ Impara</button>
	{:else}
		<div class="group" aria-label="Trasposizione">
			<button
				onclick={() => bumpTranspose(-1)}
				aria-label="Trasponi un semitono in giù"
			>−</button>

			<button
				class="value"
				class:active={transpose !== 0}
				onclick={() => transpose = 0}
				title="Azzera trasposizione"
			>{transpose > 0 ? `+${transpose}` : transpose}</button>

			<button
				onclick={() => bumpTranspose(1)}
				aria-label="Trasponi un semitono in su"
			>+</button>
		</div>

		<button onclick={() => scrolling = true}>▶ Scorri</button>

		<button
			class="menu push"
			class:active={menu === 'view'}
			aria-label="Aspetto"
			aria-expanded={menu === 'view'}
			onclick={() => openMenu('view')}
		>Aa</button>

		<button
			class="menu"
			class:active={menu === 'more'}
			class:dot={moreBadge}
			aria-label="Altre azioni"
			aria-expanded={menu === 'more'}
			onclick={() => openMenu('more')}
		>⋯</button>
	{/if}
</div>

{#if menu === 'view'}
	<div class="sheet-panel" role="dialog" aria-label="Aspetto">
		<div class="panel-head">
			<span>Aspetto</span>
			<button class="close" onclick={() => menu = null} aria-label="Chiudi">✕</button>
		</div>

		<div class="row">
			<span class="lbl">Accordi</span>
			<div class="group" role="radiogroup" aria-label="Accordi">
				{#each CHORD_MODES as [mode, label] (mode)}
					<button
						role="radio"
						aria-checked={chordMode === mode}
						class:active={chordMode === mode}
						onclick={() => setChordMode(mode)}
					>{label}</button>
				{/each}
			</div>
		</div>

		<div class="row">
			<span class="lbl">Testo</span>
			<div class="group" aria-label="Dimensione testo">
				<button
					onclick={() => fontSize = Math.max(FONT_MIN, fontSize - 1)}
					disabled={fontSize <= FONT_MIN}
					aria-label="Testo più piccolo"
				>A−</button>

				<button
					class="value"
					class:active={fontSize !== FONT_DEFAULT}
					onclick={() => fontSize = FONT_DEFAULT}
					title="Ripristina la dimensione predefinita"
					aria-label="Dimensione del testo {fontSize}, tocca per ripristinare"
				>{fontSize}</button>

				<button
					onclick={() => fontSize = Math.min(FONT_MAX, fontSize + 1)}
					disabled={fontSize >= FONT_MAX}
					aria-label="Testo più grande"
				>A+</button>
			</div>
		</div>

		{#if fitted}
			<p class="notice" role="status">
				<span aria-hidden="true">↔</span>
				Testo ridotto a {appliedSize} per stare nella larghezza dello schermo: più grande non ci sta.
			</p>
		{/if}

		{#if uniqueChords.length > 0}
			<div class="row">
				<button onclick={() => { menu = null; showDiagrams = true; }}>Diagrammi</button>
				{#if !hideChords}
					<button
						class:active={copilot}
						aria-pressed={copilot}
						onclick={() => copilot = !copilot}
					>🧭 Copilota</button>
				{/if}
			</div>
		{/if}
	</div>
{:else if menu === 'more'}
	<div class="sheet-panel" role="dialog" aria-label="Altre azioni">
		<div class="panel-head">
			<span>Altre azioni</span>
			<button class="close" onclick={() => menu = null} aria-label="Chiudi">✕</button>
		</div>

		<div class="actions">
			<button onclick={() => { menu = null; showNote = true; }}>
				📝 {hasNote ? 'Le tue note' : 'Aggiungi una nota'}
			</button>

			{#if student && uniqueChords.length > 0}
				<button
					class:active={study}
					onclick={() => { menu = null; study = !study; }}
				>
					🎓 Studia
					<span class="hint">
						{progress.missing.length === 0
							? '· accordi tutti tuoi'
							: `· ${progress.missing.length} ${progress.missing.length === 1 ? 'accordo' : 'accordi'} da imparare`}
					</span>
				</button>
			{/if}

			{#if devicePauses}
				<button onclick={resetPauses} title="Torna ai tempi del canzoniere">⏱ Azzera tempi</button>
				{#if !samePauses(devicePauses, officialPauses)}
					<a class="propose" data-sveltekit-reload href={proposalHref(data.song.category, data.song.slug, song, devicePauses)}>
						⏱ Proponi questi tempi
					</a>
				{/if}
			{/if}
		</div>
	</div>
{/if}

{#if student && study}
	<StudyPanel
		category={data.song.category}
		slug={data.song.slug}
		chords={progress.chords}
		changes={changes}
		known={known}
		transpose={progress.transpose}
		ontranspose={bumpTranspose}
		onknown={(chord) => learn(chord)}
		onplay={playAlong}
		onclose={() => study = false}
	/>
{/if}

<SongSheet
	song={song}
	transpose={transpose}
	simplify={simplify}
	hideChords={hideChords}
	fontSize={fontSize}
	bind:appliedSize
	onchord={student && !hideChords ? (chord) => helpChord = chord : undefined}
/>

{#if copilot}
	<div aria-hidden="true" style:height="{copilotTail}px"></div>
{/if}

{#if showDiagrams}
	<div class="diagrams" role="dialog" aria-label="Diagrammi degli accordi">
		<div class="diagrams-head">
			<span>Accordi del canto</span>

			<button
				class="close"
				onclick={() => showDiagrams = false}
				aria-label="Chiudi i diagrammi"
			>✕</button>
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

			<button
				class="close"
				onclick={() => showNote = false}
				aria-label="Chiudi le note"
			>✕</button>
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

{#if copilot}
	<div
		class="copilot"
		aria-live="polite"
		aria-label="Copilota degli accordi"
		bind:offsetHeight={copilotHeight}
	>
		<div class="copilot-rows">
			<div class="copilot-row">
				<span class="copilot-lbl">Ora</span>
				<span class="copilot-now-chords">{nowChords.join('  ') || '—'}</span>
			</div>
			<div class="copilot-row">
				<span class="copilot-lbl">Poi</span>
				<span class="copilot-next-chords">{nextChords.join('  ') || 'fine del canto'}</span>
			</div>
		</div>
		{#if diagramChords.length > 0}
			<div class="copilot-diagram">
				{#each diagramChords as chord (chord)}
					<ChordDiagram name={chord} scale={1.7} />
				{/each}
			</div>
		{/if}
	</div>
{/if}

{#if helpChord}
	{@const chord = helpChord}
	<ChordHelp
		chord={chord}
		known={known.includes(baseChord(chord))}
		onknown={(on) => learn(chord, on)}
		onclose={() => helpChord = null}
	/>
{/if}

<p class="feedback">
	<a
		href={resolve(`suggerimenti/?canto=${encodeURIComponent(data.song.title)}`)}
	>💬 Segnala un errore o proponi una modifica</a>
</p>

{#if ctx}
	<div class="pager">
		{#if prev}
			<a
				href={resolve(`s/${prev.category}/${prev.slug}/?${ctx.query}`)}
			>← {prev.title}</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a
				class="next"
				href={resolve(`s/${next.category}/${next.slug}/?${ctx.query}`)}
			>{next.title} →</a>
		{/if}
	</div>
{/if}

<style>
	nav {
		margin-bottom: var(--space-3);
	}

	nav a {
		text-decoration: none;
		font-size: var(--text-lg);
	}

	h1 {
		font-size: var(--text-4xl);
		margin: 0;
	}

	.star {
		font-size: var(--text-3xl);
		padding: 0 var(--space-2);
		border: none;
		background: none;
		color: var(--faint);
		vertical-align: 2px;
	}

	.star.on {
		color: var(--favorite);
	}

	.artist {
		margin: 2px 0 0;
		color: var(--muted);
	}

	.controls {
		display: flex;
		gap: var(--space-2);
		margin: var(--space-5) 0 var(--space-7);
		position: sticky;
		top: calc(env(safe-area-inset-top) + 42px);
		z-index: 5;
		background: var(--bg);
		/* Top padding keeps a visible gap below the header while stuck. */
		padding: var(--space-6) 0 var(--space-2);
	}

	button {
		font: inherit;
		font-size: var(--text-md);
		height: 38px;
		padding: 0 var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.menu {
		position: relative;
		min-width: 44px;
		font-weight: 600;
	}

	/* the menus sit at the right end of the bar */
	.push {
		margin-left: auto;
	}

	/* "⋯" holds something of this song */
	.menu.dot::after {
		content: '';
		position: absolute;
		top: 5px;
		right: 5px;
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--brand);
	}

	/* Bottom panel of the "Aa" and "⋯" menus, like the note and diagram
	   sheets: the song stays visible above it. */
	.sheet-panel {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		padding: 0 calc(env(safe-area-inset-right) + var(--space-7)) calc(env(safe-area-inset-bottom) + var(--space-7))
			calc(env(safe-area-inset-left) + var(--space-7));
	}

	.panel-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-4) 0 0;
		font-weight: 600;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
	}

	.lbl {
		min-width: 64px;
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
	}

	.sheet-panel .group button {
		background: var(--bg);
	}

	.sheet-panel .group button.active {
		background: var(--active-bg);
	}

	.hint {
		color: var(--muted);
	}

	button.active .hint {
		color: inherit;
	}

	/* the key shift stays in sight while scrolling, where it cannot change */
	.key {
		display: inline-flex;
		align-items: center;
		padding: 0 var(--space-2);
		font-size: var(--text-md);
		font-variant-numeric: tabular-nums;
		color: var(--muted);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.actions button,
	.actions a {
		text-align: left;
	}

	/* the link to the editor looks like the buttons around it */
	a.propose {
		display: flex;
		align-items: center;
		font-size: var(--text-md);
		height: 38px;
		box-sizing: border-box;
		padding: 0 var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
		background: var(--surface);
		color: var(--link);
		text-decoration: none;
	}

	button.active {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	.group {
		display: flex;
	}

	/* Adjacent buttons in a group share a border; per-corner radii compose, so
	   a button that is both first and last (single visible button) keeps both
	   sides rounded. */
	.group button {
		border-radius: 0;
		margin-left: -1px;
	}

	.group button:first-child {
		border-top-left-radius: var(--radius-md);
		border-bottom-left-radius: var(--radius-md);
		margin-left: 0;
	}

	.group button:last-child {
		border-top-right-radius: var(--radius-md);
		border-bottom-right-radius: var(--radius-md);
	}

	.value {
		min-width: 40px;
		font-variant-numeric: tabular-nums;
	}

	/* A−/A+ at their limit; the speed readout is disabled too but stays legible */
	button:disabled:not(.value) {
		color: var(--faint);
		cursor: default;
	}

	.notice {
		display: flex;
		gap: var(--space-3);
		margin: 0;
		padding: var(--space-4) var(--space-5);
		border: 1px solid var(--notice-border);
		border-radius: var(--radius-md);
		background: var(--notice-bg);
		color: var(--notice-text);
		font-size: var(--text-md);
		line-height: 1.35;
	}

	/* The row being read gets a soft highlight while the copilot is on. */
	:global(.sheet .line.copilot-now) {
		background: var(--highlight);
		border-radius: var(--radius-xs);
	}

	.copilot {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 15;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-7);
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		padding: var(--space-3) calc(env(safe-area-inset-right) + var(--space-7)) calc(env(safe-area-inset-bottom) + var(--space-3))
			calc(env(safe-area-inset-left) + var(--space-7));
	}

	.copilot-diagram {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 2px var(--space-4);
		max-width: 60%;
		overflow-x: auto;
	}

	.copilot-rows {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-family: 'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
	}

	.copilot-row {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
	}

	.copilot-lbl {
		font-family: inherit;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		min-width: 26px;
	}

	.copilot-now-chords {
		font-size: var(--text-4xl);
		font-weight: 700;
		color: var(--chord);
	}

	.copilot-next-chords {
		font-size: var(--text-2xl);
		color: var(--muted);
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
		padding: 0 var(--space-7) calc(env(safe-area-inset-bottom) + var(--space-5));
	}

	.note-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-4) 0 var(--space-2);
		font-weight: 600;
	}

	.note-sheet textarea {
		width: 100%;
		box-sizing: border-box;
		font: inherit;
		font-size: var(--text-lg);
		padding: var(--space-4) var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
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
		padding: 0 calc(env(safe-area-inset-right) + var(--space-7)) calc(env(safe-area-inset-bottom) + var(--space-5))
			calc(env(safe-area-inset-left) + var(--space-7));
	}

	.diagrams-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		position: sticky;
		top: 0;
		/* above the chord names, whose transform makes them stacking contexts */
		z-index: 1;
		background: var(--surface);
		padding: var(--space-4) 0 var(--space-2);
		font-weight: 600;
	}

	.close {
		padding: var(--space-2) var(--space-5);
	}

	.diagrams-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-7);
		justify-content: center;
	}

	.feedback {
		margin-top: var(--space-10);
		font-size: var(--text-md);
	}

	.feedback a {
		color: var(--muted);
		text-decoration: none;
	}

	.pager {
		display: flex;
		justify-content: space-between;
		gap: var(--space-7);
		margin-top: var(--space-10);
		border-top: 1px solid var(--border);
		padding-top: var(--space-6);
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
			font-size: var(--text-3xl);
		}

		.controls {
			top: 0;
			margin: var(--space-3) 0 var(--space-4);
		}

		button {
			height: 32px;
			padding: 0 var(--space-4);
		}
	}
</style>
