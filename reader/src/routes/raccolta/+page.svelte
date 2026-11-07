<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { allSongs, findSongbook, type SongRef } from '#lib/data.js';
	import { parseQuery, matchesQuery } from '#lib/search.js';
	import { encodeCollection, decodeCollection, type CollectionSong } from '#lib/collection.js';
	import { rememberCollection, newCollectionId } from '#lib/saved-collections.js';
	import { loadSavedSongPrefs } from '#lib/prefs.js';
	import { shareLink } from '#lib/share.js';
	import SearchBox from '#lib/components/SearchBox.svelte';
	import QrScanner from '#lib/components/QrScanner.svelte';
	import QrSheet from '#lib/components/QrSheet.svelte';

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

	let showQr = $state(false);

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
		// The QR of an event songbook is the link to its page.
		const book = /\/k\/([^/]+)\/?$/.exec(url.pathname);
		if (book) {
			if (!findSongbook(book[1])) return false;
			location.assign(resolve(`k/${book[1]}/`));
			return true;
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
		if ((await shareLink(shareUrl(), title.trim() || 'Scaletta')) !== 'copied') return;
		copied = true;
		setTimeout(() => copied = false, 2000);
	}
</script>

<svelte:head>
	<title>{viewing ? title.trim() || 'Scaletta' : 'Crea una scaletta'} — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{resolve('/')}">← Canzoniere</a></nav>

{#if viewing}
	<h1>🎵 {title.trim() || 'Scaletta'}</h1>
	<ol class="songs">
		{#each selected as song, i (song.category + '/' + song.slug)}
			<li>
				<a
					href={resolve(`s/${song.category}/${song.slug}/?${songQuery}`)}
				>
					<span class="num">{i + 1}.</span>
					<span class="title">{song.title}</span>
					{#if song.artist}<span class="artist">{song.artist}</span>{/if}
				</a>
			</li>
		{/each}
	</ol>
	<div class="bar">
		<button class="btn" onclick={share}>{copied ? 'Link copiato ✓' : '📤 Condividi'}</button>
		<button class="btn" onclick={() => showQr = true}>⊞ QR code</button>
		<button class="btn" onclick={() => editing = true}>✏️ Modifica</button>
	</div>
{:else}
	<h1>Crea una scaletta</h1>
	<p class="intro">
		Scegli i canti, poi condividi il link: chi lo riceve vede la stessa scaletta, senza installare
		nulla.
	</p>

	<div class="bar receive">
		<button class="btn" onclick={() => showScanner = true}>📷 Inquadra un QR</button>
		<span class="receive-hint">Ricevi una scaletta o un canzoniere da un altro telefono.</span>
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
			<button class="btn" onclick={() => showQr = true}>⊞ QR code</button>
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
	<QrScanner
		onresult={handleScan}
		onclose={() => showScanner = false}
	/>
{/if}

{#if showQr}
	<QrSheet
		title={title.trim() || 'Scaletta'}
		url={shareUrl()}
		label="QR code della scaletta"
		hint="Inquadra con la fotocamera di un altro telefono: si apre la stessa scaletta, con le personalizzazioni di chi la condivide."
		onclose={() => showQr = false}
	/>
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
		margin: 0 0 var(--space-1);
	}

	.intro {
		margin: 0 0 var(--space-5);
		color: var(--muted);
		font-size: var(--text-md);
	}

	h2 {
		font-size: var(--text-lg);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin: var(--space-8) 0 var(--space-4);
	}

	.titolo {
		width: 100%;
		box-sizing: border-box;
		font-size: var(--text-xl);
		padding: var(--space-4) var(--space-6);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		color: inherit;
	}

	.songs {
		list-style: none;
		margin: var(--space-4) 0 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid var(--border);
	}

	.songs a,
	.pick {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		width: 100%;
		padding: var(--space-4) var(--space-1);
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
		font-size: var(--text-sm);
		color: var(--muted);
		text-align: right;
		overflow-wrap: anywhere;
	}

	.picked li {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-1);
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
		border-radius: var(--radius-sm);
		padding: var(--space-1) var(--space-3);
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
		gap: var(--space-3);
		margin-top: var(--space-6);
	}

	.btn {
		font: inherit;
		font-size: var(--text-lg);
		padding: var(--space-4) var(--space-7);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
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
		padding: var(--space-5) var(--space-1);
		color: var(--muted);
	}

	.receive {
		align-items: center;
		margin: 0 0 var(--space-7);
	}

	.receive-hint {
		font-size: var(--text-sm);
		color: var(--muted);
	}

	.prefs-hint {
		margin: var(--space-4) 0 0;
		font-size: var(--text-sm);
		color: var(--muted);
	}
</style>
