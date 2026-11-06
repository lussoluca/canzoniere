<script lang="ts">
	import { refreshAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { categoryLabel } from '@canzoniere/shared/categories';
	import { online } from '#lib/online.js';
	import { getPending } from '#lib/pending.svelte.js';

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
		const res = await fetch(resolve(`api/songs/${encodeURIComponent(data.category)}/${encodeURIComponent(file)}`), {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ category: newCategory })
			}
		);
		if (!res.ok) {
			alert('Errore durante lo spostamento');
			return;
		}
		await refreshAll();
	}

	async function remove(file: string, title: string) {
		if (!confirm(`Eliminare "${title}"?`)) return;

		const res = await fetch(resolve(`api/songs/${encodeURIComponent(data.category)}/${encodeURIComponent(file)}`), { method: 'DELETE' });

		if (!res.ok) {
			alert("Errore durante l'eliminazione");
			return;
		}
		await refreshAll();
	}
</script>

<nav class="crumbs">
	<a href="{resolve('/')}">Categorie</a>
	/ {categoryLabel(data.category)}
</nav>

<div class="toolbar">
	<input
		type="search"
		placeholder="Cerca per titolo o artista…"
		bind:value={search}
		data-testid="search"
	/>
	<a
		href={resolve(`new/testo?category=${encodeURIComponent(data.category)}`)}
		class="btn primary"
		data-testid="new-song"
	>
		+ Aggiungi un testo
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
					<a
						href={resolve(`edit/${encodeURIComponent(s.category)}/${encodeURIComponent(s.file)}`)}
					>{s.title}</a>
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
		font-size: var(--text-lg);
		color: var(--muted);
		margin-bottom: var(--space-5);
	}
	.crumbs a {
		color: var(--text);
	}
	.toolbar {
		display: flex;
		gap: var(--space-4);
		align-items: center;
	}
	.toolbar input[type="search"] {
		flex: 1;
		min-width: 200px;
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
	}
	.count {
		color: var(--muted);
		font-size: var(--text-md);
	}
	.edited {
		color: var(--warning);
		font-size: var(--text-xs);
		font-weight: 600;
		margin-left: var(--space-3);
		white-space: nowrap;
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
	.actions {
		text-align: right;
		white-space: nowrap;
	}
	.move {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		font-size: var(--text-md);
		margin-right: var(--space-3);
		color: var(--muted);
	}
</style>
