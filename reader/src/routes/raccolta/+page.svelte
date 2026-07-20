<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { allSongs, type SongRef } from '$lib/data';
	import { encodeCollection, decodeCollection } from '$lib/collection';

	// The chosen songs live in the URL (?l=), so a link is the whole songbook.
	// With ?l= present the page is in view mode; otherwise it's the builder.
	let selected = $state<SongRef[]>([]);
	let title = $state('');
	let query = $state('');
	let copied = $state(false);
	let editing = $state(false);
	let hasParam = $state(false);

	const viewing = $derived(!editing && selected.length > 0 && hasParam);

	onMount(() => {
		const l = page.url.searchParams.get('l');
		hasParam = l !== null;
		selected = decodeCollection(l);
		title = page.url.searchParams.get('t') ?? '';
	});

	const selectedKeys = $derived(new Set(selected.map((s) => `${s.category}/${s.slug}`)));

	const results = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (q === '') return [];
		return allSongs
			.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
			.slice(0, 30);
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

	// Carried on every song link so the song page shows the prev/next pager and
	// a back link into this collection.
	const songQuery = $derived.by(() => {
		const params = new URLSearchParams();
		params.set('l', encodeCollection(selected));
		if (title.trim()) params.set('t', title.trim());
		return params.toString();
	});

	function shareUrl(): string {
		return `${location.origin}${location.pathname}?${songQuery}`;
	}

	async function share() {
		const url = shareUrl();
		const shareTitle = title.trim() || 'Canzoniere';
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
	<title>{viewing ? title.trim() || 'Canzoniere' : 'Crea un canzoniere'} — Canzoniere</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>

{#if viewing}
	<h1>🎵 {title.trim() || 'Canzoniere'}</h1>
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
		<button class="btn" onclick={() => (editing = true)}>✏️ Modifica</button>
	</div>
{:else}
	<h1>Crea un canzoniere</h1>
	<p class="intro">
		Scegli i canti, poi condividi il link: chi lo riceve vede la stessa scaletta, senza installare
		nulla.
	</p>

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
		</div>
	{/if}

	<h2>Aggiungi canti</h2>
	<input
		class="search"
		type="search"
		placeholder="Cerca un canto…"
		bind:value={query}
		autocomplete="off"
		autocorrect="off"
		autocapitalize="off"
	/>
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

	.titolo,
	.search {
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
	}

	.artist {
		font-size: 13px;
		color: var(--muted);
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
</style>
