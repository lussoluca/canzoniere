<script lang="ts">
	import { base } from '$app/paths';
	import { allSongs, categories, songbooks } from '$lib/data';

	let query = $state('');

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (q === '') return [];
		return allSongs.filter(
			(s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
		);
	});
</script>

<svelte:head>
	<title>Canzoniere</title>
</svelte:head>

<input
	class="search"
	type="search"
	placeholder="Cerca un canto…"
	bind:value={query}
	autocomplete="off"
	autocorrect="off"
	autocapitalize="off"
/>

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
	.search {
		width: 100%;
		box-sizing: border-box;
		font-size: 17px;
		padding: 12px 14px;
		border: 1px solid #d1d5db;
		border-radius: 10px;
		background: white;
	}

	h2 {
		font-size: 15px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #6b7280;
		margin: 24px 0 10px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 10px;
	}

	.card {
		background: white;
		border: 1px solid #e5e7eb;
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
		color: #6b7280;
	}

	.songs {
		list-style: none;
		margin: 14px 0 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid #e5e7eb;
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
	}

	.songs .artist {
		font-size: 13px;
		color: #6b7280;
		text-align: right;
	}

	.none {
		padding: 12px 4px;
		color: #6b7280;
	}
</style>
