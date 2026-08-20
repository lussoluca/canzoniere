<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { base } from '$app/paths';
	import { categoryLabel } from '$lib/categories';
	import { online } from '$lib/online';
	import { getPending } from '$lib/pending.svelte';

	let { data } = $props();

	let search = $state('');

	const filtered = $derived(
		data.songs.filter((s) => {
			if (!search) return true;
			const q = search.toLowerCase();
			return s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q);
		})
	);

	async function move(file: string, newCategory: string) {
		const res = await fetch(
			`${base}/api/songs/${encodeURIComponent(data.category)}/${encodeURIComponent(file)}`,
			{
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ category: newCategory })
			}
		);
		if (!res.ok) {
			alert('Errore durante lo spostamento');
			return;
		}
		await invalidateAll();
	}

	async function remove(file: string, title: string) {
		if (!confirm(`Eliminare "${title}"?`)) return;
		const res = await fetch(
			`${base}/api/songs/${encodeURIComponent(data.category)}/${encodeURIComponent(file)}`,
			{ method: 'DELETE' }
		);
		if (!res.ok) {
			alert("Errore durante l'eliminazione");
			return;
		}
		await invalidateAll();
	}
</script>

<nav class="crumbs"><a href="{base}/">Categorie</a> / {categoryLabel(data.category)}</nav>

<div class="toolbar">
	<input
		type="search"
		placeholder="Cerca per titolo o artista…"
		bind:value={search}
		data-testid="search"
	/>
	<a
		href={`${base}/new?category=${encodeURIComponent(data.category)}`}
		class="btn primary"
		data-testid="new-song"
	>
		+ Nuova canzone
	</a>
</div>

<p class="count" data-testid="song-count">{filtered.length} canzoni</p>

<table data-testid="song-table">
	<thead>
		<tr>
			<th>Titolo</th>
			<th>Artista</th>
			{#if !online}
				<th></th>
			{/if}
		</tr>
	</thead>
	<tbody>
		{#each filtered as s (s.file)}
			<tr data-testid="song-row">
				<td>
					<a href={`${base}/edit/${encodeURIComponent(s.category)}/${encodeURIComponent(s.file)}`}>
						{s.title}
					</a>
					{#if online && getPending(`canzoni/${s.category}/${s.file}`)}
						<span class="edited" title="Modificato su questo dispositivo, in attesa di invio">
							● modificato
						</span>
					{/if}
				</td>
				<td>{s.artist}</td>
				{#if !online}
					<td class="actions">
						<select
							class="move"
							value=""
							data-testid="move-select"
							onchange={(e) => {
								const v = e.currentTarget.value;
								e.currentTarget.value = '';
								if (v) move(s.file, v);
							}}
						>
							<option value="" disabled>Sposta in…</option>
							{#each data.categories.filter((c) => c !== data.category) as c (c)}
								<option value={c}>{categoryLabel(c)}</option>
							{/each}
						</select>
						<button class="btn danger" onclick={() => remove(s.file, s.title)}>Elimina</button>
					</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.crumbs {
		font-size: 0.9rem;
		color: #777;
		margin-bottom: 0.8rem;
	}
	.crumbs a {
		color: #2f3e46;
	}
	.toolbar {
		display: flex;
		gap: 0.6rem;
		align-items: center;
	}
	.toolbar input[type='search'] {
		flex: 1;
		min-width: 200px;
		padding: 0.45rem 0.7rem;
		border: 1px solid #ccc;
		border-radius: 6px;
	}
	.count {
		color: #777;
		font-size: 0.85rem;
	}
	.edited {
		color: #b54708;
		font-size: 0.78rem;
		font-weight: 600;
		margin-left: 0.4rem;
		white-space: nowrap;
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
	.actions {
		text-align: right;
		white-space: nowrap;
	}
	.move {
		padding: 0.3rem 0.4rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fff;
		font-size: 0.85rem;
		margin-right: 0.4rem;
		color: #555;
	}
</style>
