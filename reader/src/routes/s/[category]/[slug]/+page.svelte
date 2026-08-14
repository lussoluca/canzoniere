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
	import { feedbackHref } from '$lib/feedback';
	import { decodeCollection, type CollectionSong } from '$lib/collection';
	import { isFavorite, toggleFavorite } from '$lib/favorites';
	import { loadNote, saveNote } from '$lib/notes';
	import SongSheet from '$lib/components/SongSheet.svelte';
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
		type SongPrefs
	} from '$lib/prefs';
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
			if (b) return { songs: b.songs, backHref: `${base}/k/${b.name}/`, backLabel: b.label, query: `from=${name}` };
		}
		const l = params.get('l');
		if (l) {
			const songs = decodeCollection(l);
			if (songs.length > 0) {
				const t = params.get('t') ?? '';
				const query = `l=${encodeURIComponent(l)}${t ? `&t=${encodeURIComponent(t)}` : ''}`;
				return { songs, backHref: `${base}/raccolta/?${query}`, backLabel: t.trim() || 'Canzoniere', query };
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
	let ready = $state(false);

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
	// worth 8 px/s; the level is saved per song with the other prefs.
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
			if (last !== null) {
				carry += ((now - last) / 1000) * scrollSpeed * 8;
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
		const onTouchStart = () => {
			touching = true;
			glide = null;
		};
		const onTouchEnd = () => {
			touching = false;
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

	// Proposing a note to the group opens a prefilled GitHub issue; a workflow
	// in the repository turns it into a PR that adds {x_note:...} directives to
	// the song. GitHub handles authentication in the browser: an authenticated
	// session on github.com is not detectable cross-origin, so the button is
	// shown whenever the device is online.
	const REPO_URL = 'https://github.com/lussoluca/canzoniere';

	let online = $state(false);
	onMount(() => {
		online = navigator.onLine;
		const up = () => (online = true);
		const down = () => (online = false);
		window.addEventListener('online', up);
		window.addEventListener('offline', down);
		return () => {
			window.removeEventListener('online', up);
			window.removeEventListener('offline', down);
		};
	});

	function proposeNote() {
		const title = `Nota di gruppo: ${data.song.title}`;
		// The fenced block is what the workflow extracts; backticks are stripped
		// from the note so it cannot break out of the fence.
		const body = [
			'<!-- nota-di-gruppo',
			`canto: ${data.song.category}/${data.song.slug}`,
			'-->',
			`**Canto:** ${data.song.title} (\`${data.song.category}/${data.song.slug}\`)`,
			'',
			'**Nota proposta:**',
			'',
			'```nota',
			note.trim().replace(/`/g, "'"),
			'```',
			'',
			'_Issue aperta dal reader; una GitHub Action la trasformerà in una PR._'
		].join('\n');
		const url = `${REPO_URL}/issues/new?labels=nota-di-gruppo&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
		window.open(url, '_blank', 'noopener');
	}

	// Copilot for beginners: a fixed panel with the chords of the row being
	// read ("Ora") and of the next one ("Poi", with its first diagram), synced
	// with the scroll position so it works while scrolling by hand or with the
	// autoscroll. Rows are read from the rendered sheet, so they already
	// reflect transpose and simplified chords.
	let copilot = $state(false);
	let nowChords = $state<string[]>([]);
	let nextChords = $state<string[]>([]);
	// A chord row can repeat a chord; one diagram each is enough (also keeps the
	// {#each} key unique).
	const nextDiagrams = $derived([...new Set(nextChords)]);

	const READ_Y = 170; // viewport offset of the "reading line", below the sticky controls

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
</script>

<svelte:head>
	<title>{data.song.title} — Canzoniere Alessandria 2</title>
</svelte:head>

<nav>
	{#if ctx}
		<a href={ctx.backHref}>← {ctx.backLabel}</a>
	{:else}
		<a href="{base}/c/{data.song.category}/">← {categoryLabel(data.song.category)}</a>
	{/if}
</nav>

<h1>
	{data.song.title}
	<button
		class="star"
		class:on={favorite}
		onclick={() => (favorite = toggleFavorite(data.song.category, data.song.slug))}
		aria-label={favorite ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}
		aria-pressed={favorite}
	>
		{favorite ? '★' : '☆'}
	</button>
</h1>
{#if data.song.artist}<p class="artist">{data.song.artist}</p>{/if}

<div class="controls">
	<div class="group" aria-label="Trasposizione">
		<button onclick={() => bumpTranspose(-1)} aria-label="Trasponi un semitono in giù">−</button>
		<button class="value" class:active={transpose !== 0} onclick={() => (transpose = 0)}
			title="Azzera trasposizione">{transpose > 0 ? `+${transpose}` : transpose}</button>
		<button onclick={() => bumpTranspose(1)} aria-label="Trasponi un semitono in su">+</button>
	</div>

	<div class="group" aria-label="Dimensione testo">
		<button onclick={() => (fontSize = Math.max(FONT_MIN, fontSize - 1))} aria-label="Testo più piccolo">A−</button>
		<button onclick={() => (fontSize = Math.min(FONT_MAX, fontSize + 1))} aria-label="Testo più grande">A+</button>
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

	<button class="toggle" class:active={showNote} disabled={scrolling}
		title={scrolling ? 'Ferma lo scorrimento per aprire le note' : undefined}
		onclick={() => (showNote = !showNote)}>
		{hasNote ? '📝 Note' : 'Note'}
	</button>

	<div class="group" aria-label="Scorrimento automatico">
		<button class:active={scrolling} onclick={() => (scrolling = !scrolling)}>
			{scrolling ? '⏸ Ferma' : '▶ Scorri'}
		</button>
		{#if scrolling}
			<button onclick={() => bumpScrollSpeed(-1)} aria-label="Scorri più lentamente">−</button>
			<button class="value" aria-label="Velocità di scorrimento" disabled>{scrollSpeed}</button>
			<button onclick={() => bumpScrollSpeed(1)} aria-label="Scorri più velocemente">+</button>
		{/if}
	</div>

	{#if uniqueChords.length > 0 && !hideChords}
		<button class="toggle" class:active={copilot} onclick={() => (copilot = !copilot)}>
			🧭 Copilota
		</button>
	{/if}
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
		{#if online && hasNote}
			<div class="note-actions">
				<button class="propose" onclick={proposeNote}>👥 Proponi al gruppo</button>
				<span class="note-hint">
					Si apre GitHub: la proposta diventa una PR e, una volta approvata, la nota arriva a tutti.
				</span>
			</div>
		{/if}
	</div>
{/if}

{#if copilot}
	<div class="copilot" aria-live="polite" aria-label="Copilota degli accordi">
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
		{#if nextChords.length > 0}
			<div class="copilot-diagram">
				{#each nextDiagrams as chord (chord)}
					<ChordDiagram name={chord} scale={1.7} />
				{/each}
			</div>
		{/if}
	</div>
{/if}

<p class="feedback">
	<a
		href={feedbackHref(
			`Segnalazione sul canto "${data.song.title}"`,
			'Ho notato che…'
		)}
	>
		✉️ Segnala un errore o proponi una modifica
	</a>
</p>

{#if ctx}
	<div class="pager">
		{#if prev}
			<a href="{base}/s/{prev.category}/{prev.slug}/?{ctx.query}">← {prev.title}</a>
		{:else}
			<span></span>
		{/if}
		{#if next}
			<a class="next" href="{base}/s/{next.category}/{next.slug}/?{ctx.query}">{next.title} →</a>
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

	.star {
		font-size: 22px;
		padding: 0 6px;
		border: none;
		background: none;
		color: var(--faint);
		vertical-align: 2px;
	}

	.star.on {
		color: #d99e07;
	}

	.artist {
		margin: 2px 0 0;
		color: var(--muted);
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin: 12px 0 16px;
		position: sticky;
		top: calc(env(safe-area-inset-top) + 42px);
		z-index: 5;
		background: var(--bg);
		/* Top padding keeps a visible gap below the header while stuck. */
		padding: 14px 0 6px;
	}

	button {
		font: inherit;
		font-size: 14px;
		height: 38px;
		padding: 0 12px;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.toggle:disabled {
		opacity: 0.45;
		cursor: default;
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
		border-top-left-radius: 8px;
		border-bottom-left-radius: 8px;
		margin-left: 0;
	}

	.group button:last-child {
		border-top-right-radius: 8px;
		border-bottom-right-radius: 8px;
	}

	.value {
		min-width: 40px;
		font-variant-numeric: tabular-nums;
	}

	/* The row being read gets a soft highlight while the copilot is on. */
	:global(.sheet .line.copilot-now) {
		background: rgba(255, 209, 102, 0.22);
		border-radius: 4px;
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
		gap: 18px;
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		padding: 8px calc(env(safe-area-inset-right) + 16px) calc(env(safe-area-inset-bottom) + 8px)
			calc(env(safe-area-inset-left) + 16px);
	}

	.copilot-diagram {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: 2px 10px;
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
		gap: 10px;
	}

	.copilot-lbl {
		font-family: inherit;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		min-width: 26px;
	}

	.copilot-now-chords {
		font-size: 24px;
		font-weight: 700;
		color: var(--chord);
	}

	.copilot-next-chords {
		font-size: 17px;
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

	.note-actions {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 8px;
	}

	.propose {
		flex-shrink: 0;
	}

	.note-hint {
		font-size: 12px;
		color: #6b7280;
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
		/* above the chord names, whose transform makes them stacking contexts */
		z-index: 1;
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

	.feedback {
		margin-top: 28px;
		font-size: 14px;
	}

	.feedback a {
		color: var(--muted);
		text-decoration: none;
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
			height: 32px;
			padding: 0 10px;
		}
	}
</style>
