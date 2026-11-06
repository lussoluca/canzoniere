<script lang="ts">
	import { browser } from '$app/env';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { categoryLabel } from '@canzoniere/shared/categories';

	let { data } = $props();

	// The search text lives in the URL (?q=), so the header link back to "/"
	// clears the results and navigation preserves an ongoing search.
	const search = $derived(browser ? page.url.searchParams.get('q') ?? '' : '');

	function setSearch(value: string) {
		const url = new URL(page.url.href);
		if (value === '') url.searchParams.delete('q');
		else url.searchParams.set('q', value);
		// Replaces the entry so typing doesn't fill up the history.
		goto(url, { replace: true, reset: false });
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

	<a
		href={resolve(`new/testo`)}
		class="btn primary"
		data-testid="new-song"
	>+ Aggiungi un testo</a>
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
						<a
							href={resolve(`edit/${encodeURIComponent(s.category)}/${encodeURIComponent(s.file)}`)}
						>{s.title}</a>
					</td>
					<td>{s.artist}</td>
					<td>
						<a
							class="category"
							href={resolve(`c/${encodeURIComponent(s.category)}`)}
						>{categoryLabel(s.category)}</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{:else}
	<div class="folders">
		{#each data.categories as c (c.category)}
			<a
				href={resolve(`c/${encodeURIComponent(c.category)}`)}
				class="folder"
				data-testid="folder"
			>
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
		margin: var(--space-3) 0 var(--space-7);
	}
	.global-search {
		width: 100%;
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-7);
	}
	.folders {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: var(--space-5);
	}
	.folder {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		background: var(--surface);
		border-radius: var(--radius-lg);
		padding: var(--space-8) var(--space-8);
		text-decoration: none;
		color: inherit;
		box-shadow: 0 1px 3px var(--shadow-sm);
		transition: box-shadow 0.15s;
	}
	.folder:hover {
		box-shadow: 0 3px 10px var(--shadow);
	}
	.icon {
		font-size: var(--text-4xl);
	}
	.name {
		font-weight: 700;
		font-size: var(--text-xl);
	}
	.count {
		color: var(--faint);
		font-size: var(--text-md);
	}
	p.count {
		color: var(--muted);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		background: var(--surface);
		border-radius: var(--radius-md);
		overflow: hidden;
		box-shadow: 0 1px 3px var(--shadow-sm);
	}
	th,
	td {
		text-align: left;
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--border);
		font-size: var(--text-lg);
	}
	th {
		background: var(--surface-alt);
		font-size: var(--text-sm);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--faint);
	}
	td a {
		color: var(--text);
		font-weight: 600;
		text-decoration: none;
	}
	td a:hover {
		text-decoration: underline;
	}
	td a.category {
		font-weight: 400;
		color: var(--muted);
	}
</style>
