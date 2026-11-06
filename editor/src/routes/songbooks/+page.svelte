<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, refreshAll } from '$app/navigation';

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
			const res = await fetch(resolve(`api/songbooks`), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, entries: [] })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
			await goto(resolve(`songbooks/${encodeURIComponent(name)}`));
		} catch(e) {
			createError = e instanceof Error ? e.message : String(e);
		} finally {
			creating = false;
		}
	}

	async function remove(name: string) {
		if (!confirm(`Eliminare il canzoniere "${name}"?`)) return;
		const res = await fetch(resolve(`api/songbooks/${encodeURIComponent(name)}`), { method: 'DELETE' });
		if (!res.ok) {
			alert("Errore durante l'eliminazione");
			return;
		}
		await refreshAll();
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
				<td>
					<a
						href={resolve(`songbooks/${encodeURIComponent(b.name)}`)}
					>{b.name}</a>
				</td>

				<td>{b.count}</td>
				<td class="actions"><button class="btn danger" onclick={() => remove(b.name)}>Elimina</button></td>
			</tr>
		{:else}
			<tr><td colspan="3" class="empty">Nessun canzoniere</td></tr>
		{/each}
	</tbody>
</table>

<style>
	h2 {
		margin: var(--space-3) 0 var(--space-7);
	}
	.create {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		margin-bottom: var(--space-7);
	}
	.create input {
		flex: 1;
		min-width: 220px;
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
	}
	.error {
		color: var(--danger);
		font-size: var(--text-md);
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
	}
	.empty {
		color: var(--faint);
	}
</style>
