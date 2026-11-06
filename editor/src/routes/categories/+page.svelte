<script lang="ts">
	import { resolve } from '$app/paths';
	import { refreshAll } from '$app/navigation';
	import { categoryLabel, isValidCategoryName } from '@canzoniere/shared/categories';
	import { slugify } from '#lib/slug.js';

	let { data } = $props();

	let newName = $state('');
	let creating = $state(false);
	let createError = $state('');

	// inline rename state: which category is being edited and its draft name
	let editing = $state<string | null>(null);
	let editName = $state('');
	let rowError = $state('');

	async function create() {
		const name = slugify(newName.trim());
		if (!name || !isValidCategoryName(name)) {
			createError = 'Nome non valido';
			return;
		}
		creating = true;
		createError = '';
		try {
			const res = await fetch(resolve(`api/categories`), {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
			newName = '';
			await refreshAll();
		} catch (e) {
			createError = e instanceof Error ? e.message : String(e);
		} finally {
			creating = false;
		}
	}

	function startEdit(category: string) {
		editing = category;
		editName = category;
		rowError = '';
	}

	function cancelEdit() {
		editing = null;
		editName = '';
		rowError = '';
	}

	async function saveEdit(oldName: string) {
		const name = slugify(editName.trim());
		if (!name || !isValidCategoryName(name)) {
			rowError = 'Nome non valido';
			return;
		}
		if (name === oldName) {
			cancelEdit();
			return;
		}
		try {
			const res = await fetch(resolve(`api/categories/${encodeURIComponent(oldName)}`), {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name })
			});
			if (!res.ok) throw new Error((await res.json()).message ?? res.statusText);
			cancelEdit();
			await refreshAll();
		} catch (e) {
			rowError = e instanceof Error ? e.message : String(e);
		}
	}

	async function move(index: number, dir: -1 | 1) {
		const order = data.categories.map((c) => c.category);
		const j = index + dir;
		if (j < 0 || j >= order.length) return;
		[order[index], order[j]] = [order[j], order[index]];
		const res = await fetch(resolve(`api/categories`), {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ order })
		});
		if (!res.ok) {
			alert("Errore durante il riordino");
			return;
		}
		await refreshAll();
	}

	async function remove(category: string, count: number) {
		const others = data.categories.filter((c) => c.category !== category);
		if (others.length === 0) {
			alert('Non puoi eliminare l’unica categoria rimasta.');
			return;
		}
		const list = others.map((c) => `- ${c.category}`).join('\n');
		const target =
			count > 0
				? prompt(
						`La categoria "${category}" contiene ${count} canzoni.\n` +
							`Inserisci la categoria di destinazione in cui spostarle:\n\n${list}`,
						others[0].category
					)
				: // empty category: nothing to move, but the API still wants a valid target
					others[0].category;
		if (target === null) return; // user cancelled
		const dest = (target ?? '').trim();
		if (count > 0 && !data.categories.some((c) => c.category === dest)) {
			alert(`La categoria di destinazione "${dest}" non esiste.`);
			return;
		}

		if (!confirm(`Eliminare la categoria "${category}"${count > 0 ? ` e spostare ${count} canzoni in "${dest}"` : ''}?`)) return;

		const res = await fetch(resolve(`api/categories/${encodeURIComponent(category)}`), {
			method: 'DELETE',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ target: dest })
		});
		if (!res.ok) {
			alert((await res.json()).message ?? "Errore durante l'eliminazione");
			return;
		}
		await refreshAll();
	}
</script>

<svelte:head>
	<title>Categorie · Canzoniere</title>
</svelte:head>

<h2>Gestione categorie</h2>
<p class="intro">
	Le categorie sono le cartelle in cui vivono le canzoni. Le modifiche qui si riflettono sul
	filesystem: rinominando una categoria viene riscritto il <code>{`{tag:…}`}</code> di tutte le sue
	canzoni; eliminandola le canzoni vengono spostate nella categoria che indichi.
</p>

<form
	class="create"
	onsubmit={(e) => {
		e.preventDefault();
		create();
	}}
>
	<input placeholder="Nome della nuova categoria…" bind:value={newName} data-testid="new-category-name" />
	<button class="btn primary" type="submit" disabled={creating} data-testid="new-category-create">
		Crea
	</button>
	{#if createError}<span class="error">{createError}</span>{/if}
</form>

<table data-testid="category-table">
	<thead>
		<tr>
			<th>Categoria</th>
			<th>Cartella</th>
			<th>Canzoni</th>
			<th></th>
		</tr>
	</thead>
	<tbody>
		{#each data.categories as c, i (c.category)}
			<tr data-testid="category-row">
				{#if editing === c.category}
					<td colspan="2">
						<form
							class="edit"
							onsubmit={(e) => {
								e.preventDefault();
								saveEdit(c.category);
							}}
						>
							<input bind:value={editName} data-testid="edit-category-name" />
							<button class="btn primary" type="submit">Salva</button>
							<button class="btn" type="button" onclick={cancelEdit}>Annulla</button>
							{#if rowError}<span class="error">{rowError}</span>{/if}
						</form>
					</td>
				{:else}
					<td>
						<a
							href={resolve(`c/${encodeURIComponent(c.category)}`)}
						>{categoryLabel(c.category)}</a>
					</td>
					<td><code>{c.category}</code></td>
				{/if}
				<td>{c.count}</td>
				<td class="actions">
					{#if editing !== c.category}
						<button
							class="btn icon"
							title="Sposta su"
							aria-label="Sposta su"
							disabled={i === 0}
							onclick={() => move(i, -1)}>↑</button
						>
						<button
							class="btn icon"
							title="Sposta giù"
							aria-label="Sposta giù"
							disabled={i === data.categories.length - 1}
							onclick={() => move(i, 1)}>↓</button
						>
						<button class="btn" onclick={() => startEdit(c.category)}>Rinomina</button>
						<button class="btn danger" onclick={() => remove(c.category, c.count)}>Elimina</button>
					{/if}
				</td>
			</tr>
		{:else}
			<tr><td colspan="4" class="empty">Nessuna categoria</td></tr>
		{/each}
	</tbody>
</table>

<style>
	h2 {
		margin: var(--space-3) 0 var(--space-4);
	}
	.intro {
		color: var(--muted);
		line-height: 1.6;
		margin: 0 0 var(--space-7);
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
	.edit {
		display: flex;
		gap: var(--space-3);
		align-items: center;
	}
	.edit input {
		padding: var(--space-2) var(--space-4);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
		min-width: 180px;
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
	code {
		background: var(--surface-alt);
		border-radius: var(--radius-xs);
		padding: 0.05rem var(--space-2);
		font-size: 0.88em;
	}
	.actions {
		text-align: right;
		white-space: nowrap;
	}
	.btn.icon {
		padding: var(--space-2) var(--space-4);
		line-height: 1;
	}
	.btn.icon:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.empty {
		color: var(--faint);
	}
</style>
