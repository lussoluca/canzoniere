<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { categoryLabel } from '$lib/categories';

	let { data } = $props();

	// The search text lives in the URL (?q=), so the header link back to "/"
	// clears the results and navigation preserves an ongoing search.
	const search = $derived(browser ? (page.url.searchParams.get('q') ?? '') : '');

	function setSearch(value: string) {
		const url = new URL(page.url);
		if (value === '') url.searchParams.delete('q');
		else url.searchParams.set('q', value);
		// Replaces the entry so typing doesn't fill up the history.
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	const filtered = $derived.by(() => {
		if (search.trim() === '') return [];
		const q = search.trim().toLowerCase();
		return data.songs.filter(
			(s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
		);
	});
</script>

<div class="head">
	<h2>Categorie</h2>
	<a href="/new" class="btn primary" data-testid="new-song">+ Nuova canzone</a>
</div>

<input
	type="search"
	class="global-search"
	placeholder="Cerca per titolo o artista in tutte le categorie…"
	value={search}
	oninput={(e) => setSearch(e.currentTarget.value)}
	data-testid="global-search"
/>

{#if search.trim() !== ''}
	<p class="count" data-testid="song-count">{filtered.length} canzoni</p>

	<table data-testid="song-table">
		<thead>
			<tr>
				<th>Titolo</th>
				<th>Artista</th>
				<th>Categoria</th>
			</tr>
		</thead>
		<tbody>
			{#each filtered as s (s.category + '/' + s.file)}
				<tr data-testid="song-row">
					<td>
						<a href={`/edit/${encodeURIComponent(s.category)}/${encodeURIComponent(s.file)}`}>
							{s.title}
						</a>
					</td>
					<td>{s.artist}</td>
					<td>
						<a class="category" href={`/c/${encodeURIComponent(s.category)}`}>
							{categoryLabel(s.category)}
						</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<div class="folders">
		{#each data.categories as c (c.category)}
			<a href={`/c/${encodeURIComponent(c.category)}`} class="folder" data-testid="folder">
				<span class="icon">📁</span>
				<span class="name">{categoryLabel(c.category)}</span>
				<span class="count">{c.count} canzoni</span>
			</a>
		{/each}
	</div>
{/if}

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		margin: 0.4rem 0 1rem;
	}
	.global-search {
		width: 100%;
		padding: 0.45rem 0.7rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		margin-bottom: 1rem;
	}
	.folders {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.8rem;
	}
	.folder {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		background: #fff;
		border-radius: 10px;
		padding: 1.1rem 1.2rem;
		text-decoration: none;
		color: inherit;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		transition: box-shadow 0.15s;
	}
	.folder:hover {
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
	}
	.icon {
		font-size: 1.6rem;
	}
	.name {
		font-weight: 700;
		font-size: 1.05rem;
	}
	.count {
		color: #888;
		font-size: 0.85rem;
	}
	p.count {
		color: #777;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: #fff;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	th,
	td {
		text-align: left;
		padding: 0.55rem 0.8rem;
		border-bottom: 1px solid #eee;
		font-size: 0.92rem;
	}
	th {
		background: #fafafa;
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #888;
	}
	td a {
		color: #2f3e46;
		font-weight: 600;
		text-decoration: none;
	}
	td a:hover {
		text-decoration: underline;
	}
	td a.category {
		font-weight: 400;
		color: #777;
	}
</style>
