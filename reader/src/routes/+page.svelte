<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { allSongs, categories, songbooks, findSong, type SongRef } from '$lib/data';
	import { parseQuery, matchesQuery } from '$lib/search';
	import { loadFavorites } from '$lib/favorites';
	import { feedbackHref } from '$lib/feedback';
	import SearchBox from '$lib/components/SearchBox.svelte';

	// The search text lives in the URL (?q=), so following the header link back
	// to "/" leaves the results and shows the home page again. The guard keeps
	// the prerenderer from touching the query string at build time.
	const query = $derived(browser ? (page.url.searchParams.get('q') ?? '') : '');

	function setQuery(value: string) {
		const url = new URL(page.url);
		if (value === '') url.searchParams.delete('q');
		else url.searchParams.set('q', value);
		// Replaces the entry so typing doesn't fill up the history.
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	// Starred songs, resolved to SongRefs; localStorage only exists client-side.
	let favorites = $state<SongRef[]>([]);
	onMount(() => {
		favorites = loadFavorites()
			.map((key) => {
				const [category, ...rest] = key.split('/');
				return findSong(category, rest.join('/'));
			})
			.filter((s): s is SongRef => s !== undefined)
			.sort((a, b) => a.title.localeCompare(b.title, 'it'));
	});

	const filtered = $derived.by(() => {
		if (query.trim() === '') return [];
		const q = parseQuery(query);
		return allSongs.filter((s) => matchesQuery(s, q));
	});
</script>

<svelte:head>
	<title>Canzoniere Alessandria 2</title>
</svelte:head>

<SearchBox bind:value={() => query, setQuery} placeholder="Cerca un canto… (#tag per filtrare)" />

{#if query.trim() !== ''}
	<ul class="songs">
		{#each filtered as song (song.category + '/' + song.slug)}
			<li>
				<a href="{base}/s/{song.category}/{song.slug}/">
					<span class="title">{song.title}</span>
					{#if song.artist}<span class="artist">{song.artist}</span>{/if}
				</a>
			</li>
		{:else}
			<li class="none">Nessun canto trovato.</li>
		{/each}
	</ul>
{:else}
	<div class="actions">
		<a class="tool" href="{base}/accordi/">🎸 Cosa posso suonare</a>
		<a class="tool" href="{base}/raccolta/">🎵 Crea un canzoniere</a>
		<a class="tool" href={feedbackHref('Commenti e suggerimenti sul canzoniere')}>
			✉️ Commenti e suggerimenti
		</a>
	</div>

	{#if favorites.length > 0}
		<h2>Preferiti</h2>
		<ul class="songs">
			{#each favorites as song (song.category + '/' + song.slug)}
				<li>
					<a href="{base}/s/{song.category}/{song.slug}/">
						<span class="title">★ {song.title}</span>
						{#if song.artist}<span class="artist">{song.artist}</span>{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}

	<h2>Categorie</h2>
	<div class="grid">
		{#each categories as cat (cat.name)}
			<a class="card" href="{base}/c/{cat.name}/">
				<span class="label">📁 {cat.label}</span>
				<span class="count">{cat.count} canti</span>
			</a>
		{/each}
	</div>

	{#if songbooks.length > 0}
		<h2>Canzonieri per eventi</h2>
		<div class="grid">
			{#each songbooks as book (book.name)}
				<a class="card" href="{base}/k/{book.name}/">
					<span class="label">🗓️ {book.label}</span>
					<span class="count">{book.songs.length} canti</span>
				</a>
			{/each}
		</div>
	{/if}
{/if}

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 14px;
	}

	.tool {
		font-size: 15px;
		padding: 10px 16px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
		-webkit-tap-highlight-color: transparent;
	}

	h2 {
		font-size: 15px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin: 24px 0 10px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 10px;
	}

	.card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 10px;
		padding: 14px;
		text-decoration: none;
		color: inherit;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.card .label {
		font-weight: 600;
	}

	.card .count {
		font-size: 13px;
		color: var(--muted);
	}

	.songs {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid var(--border);
	}

	.songs a {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 12px 4px;
		text-decoration: none;
		color: inherit;
	}

	.songs .title {
		font-weight: 500;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.songs .artist {
		font-size: 13px;
		color: var(--muted);
		text-align: right;
	}

	.none {
		padding: 12px 4px;
		color: var(--muted);
	}
</style>
