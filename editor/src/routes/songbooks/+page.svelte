<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';

	let { data } = $props();

	let newName = $state('');
	let creating = $state(false);
	let createError = $state('');

	async function create() {
		const name = newName.trim().toLowerCase().replace(/\s+/g, '_');
		if (!name) return;
		creating = true;
		createError = '';
		try {
			const res = await fetch('/api/songbooks', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, entries: [] })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
			await goto(`/songbooks/${encodeURIComponent(name)}`);
		} catch (e) {
			createError = e instanceof Error ? e.message : String(e);
		} finally {
			creating = false;
		}
	}

	async function remove(name: string) {
		if (!confirm(`Eliminare il canzoniere "${name}"?`)) return;
		const res = await fetch(`/api/songbooks/${encodeURIComponent(name)}`, { method: 'DELETE' });
		if (!res.ok) {
			alert("Errore durante l'eliminazione");
			return;
		}
		await invalidateAll();
	}
</script>

<h2>Canzonieri per eventi</h2>

<form
	class="create"
	onsubmit={(e) => {
		e.preventDefault();
		create();
	}}
>
	<input placeholder="Nome del nuovo canzoniere…" bind:value={newName} data-testid="new-songbook-name" />
	<button class="btn primary" type="submit" disabled={creating} data-testid="new-songbook-create">
		Crea
	</button>
	{#if createError}<span class="error">{createError}</span>{/if}
</form>

<table data-testid="songbook-table">
	<thead>
		<tr>
			<th>Nome</th>
			<th>Canzoni</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.songbooks as b (b.name)}
			<tr data-testid="songbook-row">
				<td><a href={`/songbooks/${encodeURIComponent(b.name)}`}>{b.name}</a></td>
				<td>{b.count}</td>
				<td class="actions">
					<button class="btn danger" onclick={() => remove(b.name)}>Elimina</button>
				</td>
			</tr>
		{:else}
			<tr><td colspan="3" class="empty">Nessun canzoniere</td></tr>
		{/each}
	</tbody>
</table>

<style>
	h2 {
		margin: 0.4rem 0 1rem;
	}
	.create {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		margin-bottom: 1rem;
	}
	.create input {
		flex: 1;
		min-width: 220px;
		padding: 0.45rem 0.7rem;
		border: 1px solid #ccc;
		border-radius: 6px;
	}
	.error {
		color: #b3261e;
		font-size: 0.85rem;
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
	}
	.empty {
		color: #999;
	}
</style>
