<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import qrcode from 'qrcode-generator';
	import { allSongs, type SongRef } from '$lib/data';
	import { parseQuery, matchesQuery } from '$lib/search';
	import { encodeCollection, decodeCollection, type CollectionSong } from '$lib/collection';
	import { rememberCollection, newCollectionId } from '$lib/saved-collections';
	import { loadSavedSongPrefs } from '$lib/prefs';
	import SearchBox from '$lib/components/SearchBox.svelte';
	import QrScanner from '$lib/components/QrScanner.svelte';

	// The chosen songs live in the URL (?l=), so a link is the whole songbook.
	// With ?l= present the page is in view mode; otherwise it's the builder.
	let selected = $state<CollectionSong[]>([]);
	let title = $state('');
	let query = $state('');
	let copied = $state(false);
	let editing = $state(false);
	let hasParam = $state(false);

	// Identity of the set in the device storage: it comes from ?i= when the set
	// is reopened from the menu, and is minted on the first edit otherwise.
	let localId = $state<string | undefined>(undefined);
	// Autosaving only starts once the URL has been read, so an empty builder
	// cannot overwrite the set it is about to load.
	let loaded = $state(false);

	const viewing = $derived(!editing && selected.length > 0 && hasParam);

	onMount(() => {
		const l = page.url.searchParams.get('l');
		hasParam = l !== null;
		selected = decodeCollection(l);
		title = page.url.searchParams.get('t') ?? '';
		localId = page.url.searchParams.get('i') ?? undefined;
		// Remember every opened set so the main menu can bring it back after
		// the page is closed, and it can be re-shared from there.
		if (l && selected.length > 0) localId = rememberCollection(l, title.trim(), localId);
		loaded = true;
	});

	// A set built here is kept on this device too, so closing the app does not
	// lose it: it comes back from the "Scalette temporanee" menu. Debounced
	// because it reacts to every pick, reorder and keystroke in the title.
	$effect(() => {
		const l = encodeCollection(selected.map(withPrefs));
		const t = title.trim();
		if (!loaded || selected.length === 0) return;
		const timer = setTimeout(() => {
			localId = rememberCollection(l, t, localId ?? newCollectionId());
		}, 600);
		return () => clearTimeout(timer);
	});

	const selectedKeys = $derived(new Set(selected.map((s) => `${s.category}/${s.slug}`)));

	// The whole list is shown by default (so you can browse without knowing the
	// titles); typing narrows it.
	const results = $derived.by(() => {
		if (query.trim() === '') return allSongs;
		const q = parseQuery(query);
		return allSongs.filter((s) => matchesQuery(s, q));
	});

	function toggle(song: SongRef) {
		const key = `${song.category}/${song.slug}`;
		selected = selectedKeys.has(key)
			? selected.filter((s) => `${s.category}/${s.slug}` !== key)
			: [...selected, song];
	}

	function move(i: number, delta: number) {
		const j = i + delta;
		if (j < 0 || j >= selected.length) return;
		const copy = [...selected];
		[copy[i], copy[j]] = [copy[j], copy[i]];
		selected = copy;
	}

	// A shared entry keeps the prefs it arrived with; a song picked here gets
	// the prefs saved on this device (transpose, simplified chords, scroll
	// speed), so the link and the QR carry the sender's personalizations.
	function withPrefs(song: CollectionSong): CollectionSong {
		if (song.prefs) return song;
		const saved = loadSavedSongPrefs(song.category, song.slug);
		return saved ? { ...song, prefs: saved } : song;
	}

	// Carried on every song link so the song page shows the prev/next pager and
	// a back link into this collection.
	const songQuery = $derived.by(() => {
		const params = new URLSearchParams();
		params.set('l', encodeCollection(selected.map(withPrefs)));
		if (title.trim()) params.set('t', title.trim());
		return params.toString();
	});

	function shareUrl(): string {
		return `${location.origin}${location.pathname}?${songQuery}`;
	}

	// The QR is generated on the device (no network), so a set can be passed
	// around by pointing cameras at a phone even where there is no signal.
	let showQr = $state(false);
	let qrSvg = $state('');

	function openQr() {
		const qr = qrcode(0, 'M');
		qr.addData(shareUrl());
		qr.make();
		qrSvg = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
		showQr = true;
	}

	// Receiving side of the QR flow: scanning from inside the app keeps the
	// set in the installed PWA (the system camera would open the browser).
	let showScanner = $state(false);

	function handleScan(text: string): boolean {
		let url: URL;
		try {
			url = new URL(text);
		} catch {
			return false;
		}
		const l = url.searchParams.get('l');
		if (!l || decodeCollection(l).length === 0) return false;
		const params = new URLSearchParams();
		params.set('l', l);
		const t = url.searchParams.get('t');
		if (t) params.set('t', t);
		// Full navigation on purpose: this page reads its params on mount, and
		// the scanned QR may carry the deployed origin while the app runs on
		// another one, so only the query is kept.
		location.assign(`${location.pathname}?${params}`);
		return true;
	}

	async function share() {
		const url = shareUrl();
		const shareTitle = title.trim() || 'Scaletta';
		if (navigator.share) {
			try {
				await navigator.share({ title: shareTitle, url });
				return;
			} catch {
				// user dismissed the share sheet: fall through to copy
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// clipboard blocked: nothing else to do
		}
	}
</script>

<svelte:head>
	<title>{viewing ? title.trim() || 'Scaletta' : 'Crea una scaletta'} — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>

{#if viewing}
	<h1>🎵 {title.trim() || 'Scaletta'}</h1>
	<ol class="songs">
		{#each selected as song, i (song.category + '/' + song.slug)}
			<li>
				<a href="{base}/s/{song.category}/{song.slug}/?{songQuery}">
					<span class="num">{i + 1}.</span>
					<span class="title">{song.title}</span>
					{#if song.artist}<span class="artist">{song.artist}</span>{/if}
				</a>
			</li>
		{/each}
	</ol>
	<div class="bar">
		<button class="btn" onclick={share}>{copied ? 'Link copiato ✓' : '📤 Condividi'}</button>
		<button class="btn" onclick={openQr}>⊞ QR code</button>
		<button class="btn" onclick={() => (editing = true)}>✏️ Modifica</button>
	</div>
{:else}
	<h1>Crea una scaletta</h1>
	<p class="intro">
		Scegli i canti, poi condividi il link: chi lo riceve vede la stessa scaletta, senza installare
		nulla.
	</p>

	<div class="bar receive">
		<button class="btn" onclick={() => (showScanner = true)}>📷 Inquadra un QR</button>
		<span class="receive-hint">Ricevi una scaletta da un altro telefono.</span>
	</div>

	<input class="titolo" placeholder="Titolo (facoltativo)" bind:value={title} />

	{#if selected.length > 0}
		<h2>Scaletta ({selected.length})</h2>
		<ol class="songs picked">
			{#each selected as song, i (song.category + '/' + song.slug)}
				<li>
					<span class="num">{i + 1}.</span>
					<span class="title">{song.title}</span>
					<span class="row-tools">
						<button onclick={() => move(i, -1)} disabled={i === 0} aria-label="Sposta su">↑</button>
						<button onclick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label="Sposta giù">↓</button>
						<button onclick={() => toggle(song)} aria-label="Rimuovi">✕</button>
					</span>
				</li>
			{/each}
		</ol>
		<div class="bar">
			<button class="btn primary" onclick={share}>{copied ? 'Link copiato ✓' : '📤 Condividi il link'}</button>
			<button class="btn" onclick={openQr}>⊞ QR code</button>
		</div>
		<p class="prefs-hint">
			Il link e il QR includono le tue personalizzazioni dei canti scelti: tonalità, accordi
			semplici, velocità di scorrimento.
		</p>
		<p class="prefs-hint">
			La scaletta resta su questo telefono: la ritrovi nel menu, sotto «Scalette temporanee».
		</p>
	{/if}

	<h2>Aggiungi canti</h2>
	<SearchBox bind:value={query} placeholder="Cerca un canto… (#tag per filtrare)" />
	<ul class="songs">
		{#each results as song (song.category + '/' + song.slug)}
			<li>
				<button
					class="pick"
					class:on={selectedKeys.has(`${song.category}/${song.slug}`)}
					onclick={() => toggle(song)}
				>
					<span class="check">{selectedKeys.has(`${song.category}/${song.slug}`) ? '✓' : '+'}</span>
					<span class="title">{song.title}</span>
					{#if song.artist}<span class="artist">{song.artist}</span>{/if}
				</button>
			</li>
		{:else}
			{#if query.trim() !== ''}<li class="none">Nessun canto trovato.</li>{/if}
		{/each}
	</ul>
{/if}

{#if showScanner}
	<QrScanner onresult={handleScan} onclose={() => (showScanner = false)} />
{/if}

{#if showQr}
	<div class="qr-sheet" role="dialog" aria-label="QR code della scaletta">
		<div class="qr-head">
			<span>{title.trim() || 'Scaletta'}</span>
			<button class="close" onclick={() => (showQr = false)} aria-label="Chiudi il QR code">✕</button>
		</div>
		<div class="qr-box">{@html qrSvg}</div>
		<p class="qr-hint">
			Inquadra con la fotocamera di un altro telefono: si apre la stessa scaletta, con le
			personalizzazioni di chi la condivide.
		</p>
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
		margin: 0 0 4px;
	}

	.intro {
		margin: 0 0 12px;
		color: var(--muted);
		font-size: 14px;
	}

	h2 {
		font-size: 15px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin: 20px 0 10px;
	}

	.titolo {
		width: 100%;
		box-sizing: border-box;
		font-size: 16px;
		padding: 10px 14px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		color: inherit;
	}

	.songs {
		list-style: none;
		margin: 10px 0 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid var(--border);
	}

	.songs a,
	.pick {
		display: flex;
		align-items: baseline;
		gap: 10px;
		width: 100%;
		padding: 11px 4px;
		text-decoration: none;
		color: inherit;
		font: inherit;
		background: none;
		border: none;
		text-align: left;
		cursor: pointer;
	}

	.num {
		color: var(--faint);
		font-variant-numeric: tabular-nums;
	}

	.title {
		font-weight: 500;
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.artist {
		font-size: 13px;
		color: var(--muted);
		text-align: right;
		overflow-wrap: anywhere;
	}

	.picked li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 4px;
	}

	.picked .title {
		flex: 1;
	}

	.row-tools {
		display: flex;
		gap: 2px;
	}

	.row-tools button {
		font: inherit;
		border: 1px solid var(--control-border);
		background: var(--surface);
		color: inherit;
		border-radius: 6px;
		padding: 4px 9px;
		cursor: pointer;
	}

	.row-tools button:disabled {
		opacity: 0.4;
	}

	.pick .check {
		display: inline-flex;
		justify-content: center;
		width: 22px;
		color: var(--muted);
		font-weight: 700;
	}

	.pick.on .check {
		color: var(--chord);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}

	.btn {
		font: inherit;
		font-size: 15px;
		padding: 10px 16px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.btn.primary {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	.none {
		padding: 12px 4px;
		color: var(--muted);
	}

	.receive {
		align-items: center;
		margin: 0 0 16px;
	}

	.receive-hint {
		font-size: 13px;
		color: var(--muted);
	}

	.prefs-hint {
		margin: 10px 0 0;
		font-size: 13px;
		color: var(--muted);
	}

	/* Bottom sheet, same look as the diagram/note sheets on the song page. */
	.qr-sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 20;
		background: var(--surface);
		border-top: 1px solid var(--control-border);
		box-shadow: 0 -4px 16px var(--shadow);
		max-height: 80dvh;
		overflow-y: auto;
		padding: 0 calc(env(safe-area-inset-right) + 16px) calc(env(safe-area-inset-bottom) + 12px)
			calc(env(safe-area-inset-left) + 16px);
	}

	.qr-head {
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
		font: inherit;
		font-size: 14px;
		padding: 6px 12px;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
	}

	/* Always on white with quiet-zone padding, so cameras read it in dark mode too. */
	.qr-box {
		background: #fff;
		border-radius: 12px;
		padding: 16px;
		margin: 6px auto 0;
		width: min(70vw, 280px);
	}

	.qr-box :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}

	.qr-hint {
		margin: 10px 0 4px;
		font-size: 13px;
		color: var(--muted);
		text-align: center;
	}
</style>
