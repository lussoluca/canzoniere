<script lang="ts">
	import { resolve } from '$app/paths';
	import { categoryLabel } from '@canzoniere/shared/categories';

	let { data } = $props();

	let entries = $state([...data.entries]);
	let filter = $state('');
	let status = $state('');
	let saving = $state(false);

	// path -> song lookup for resolving titles
	const byPath = $derived(new Map(data.allSongs.map((s) => [`${s.category}/${s.file}`, s])));

	const available = $derived(
		data.allSongs.filter((s) => {
		const p = `${s.category}/${s.file}`;
		if (entries.includes(p)) return false;
		if (!filter) return true;
		return s.title.toLowerCase().includes(filter.toLowerCase());
		})
	);

	function add(path: string) {
		entries.push(path);
		status = '';
	}

	function removeAt(i: number) {
		entries.splice(i, 1);
		status = '';
	}

	function move(i: number, delta: number) {
		const j = i + delta;
		if (j < 0 || j >= entries.length) return;
		[entries[i], entries[j]] = [entries[j], entries[i]];
		status = '';
	}

	async function save() {
		saving = true;
		status = '';
		try {
			const res = await fetch(resolve(`api/songbooks/${encodeURIComponent(data.name)}`), {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ entries: $state.snapshot(entries) })
			});
			if (!res.ok) throw new Error(await res.text());
			status = 'Salvato ✓';
		} catch (e) {
			status = `Errore: ${e instanceof Error ? e.message : e}`;
		} finally {
			saving = false;
		}
	}
</script>

<nav class="crumbs">
	<a href={resolve(`songbooks`)}>Canzonieri</a>
	/ {data.name}
</nav>

<div class="head">
	<h2>{data.name}</h2>
	<span class="status" data-testid="songbook-status">{status}</span>
	<button class="btn primary" onclick={save} disabled={saving} data-testid="songbook-save">
		Salva
	</button>
</div>

<div class="cols">
	<section class="panel">
		<h3>Canzoni nel canzoniere ({entries.length})</h3>
		<ol data-testid="songbook-entries">
			{#each entries as e, i (e)}
				{@const song = byPath.get(e)}
				<li data-testid="songbook-entry">
					<span class="title">
						{#if song}
							<a
								href={resolve(`edit/${encodeURIComponent(song.category)}/${encodeURIComponent(song.file)}`)}
								data-testid="entry-edit">{song.title}</a
							>
							<small class="cat">{categoryLabel(song.category)}</small>
						{:else}
							<span class="missing" title="File non trovato">{e} ⚠︎</span>
						{/if}
					</span>
					<span class="entry-actions">
						<button onclick={() => move(i, -1)} disabled={i === 0} title="Sposta su">↑</button>
						<button onclick={() => move(i, 1)} disabled={i === entries.length - 1} title="Sposta giù">
							↓
						</button>
						<button class="remove" onclick={() => removeAt(i)} title="Rimuovi" data-testid="entry-remove">
							✕
						</button>
					</span>
				</li>
			{:else}
				<li class="empty">Nessuna canzone: aggiungile dalla lista a fianco.</li>
			{/each}
		</ol>
	</section>

	<section class="panel">
		<h3>Aggiungi canzoni</h3>
		<input
			type="search"
			placeholder="Cerca per titolo…"
			bind:value={filter}
			data-testid="picker-search"
		/>
		<ul class="picker" data-testid="picker">
			{#each available as s (s.category + '/' + s.file)}
				<li>
					<button class="add" onclick={() => add(`${s.category}/${s.file}`)} data-testid="picker-add">
						＋ {s.title}
						<small class="cat">{categoryLabel(s.category)}</small>
					</button>
				</li>
			{/each}
		</ul>
	</section>
</div>

<style>
	.crumbs {
		font-size: var(--text-lg);
		color: var(--muted);
		margin-bottom: var(--space-5);
	}
	.crumbs a {
		color: var(--text);
	}
	.head {
		display: flex;
		align-items: center;
		gap: var(--space-5);
		margin-bottom: var(--space-5);
	}
	.head h2 {
		margin: 0;
		flex: 1;
	}
	.status {
		font-size: var(--text-md);
		color: var(--success);
	}
	.cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-7);
		align-items: start;
	}
	.panel {
		background: var(--surface);
		border-radius: var(--radius-md);
		padding: var(--space-6) var(--space-8);
		box-shadow: 0 1px 3px var(--shadow-sm);
	}
	.panel h3 {
		margin: 0 0 var(--space-4);
		font-size: var(--text-lg);
	}
	ol {
		margin: 0;
		padding-left: var(--space-9);
	}
	ol li {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-1) 0;
		border-bottom: 1px solid var(--border);
	}
	ol li .title {
		flex: 1;
	}
	ol li .title a {
		color: inherit;
	}
	.cat {
		color: var(--faint);
		margin-left: var(--space-2);
	}
	.missing {
		color: var(--danger);
	}
	.entry-actions button {
		border: none;
		background: var(--surface-alt);
		border-radius: var(--radius-xs);
		cursor: pointer;
		padding: 1px var(--space-2);
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.entry-actions button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.entry-actions .remove {
		background: var(--danger-bg);
		color: var(--danger);
	}
	.empty {
		color: var(--faint);
		border: none;
	}
	input[type="search"] {
		width: 100%;
		padding: var(--space-3) var(--space-5);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-3);
	}
	.picker {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 60vh;
		overflow-y: auto;
	}
	.picker .add {
		width: 100%;
		text-align: left;
		border: none;
		background: none;
		padding: var(--space-2) var(--space-1);
		cursor: pointer;
		border-radius: var(--radius-xs);
		font-size: var(--text-lg);
	}
	.picker .add:hover {
		background: var(--accent-bg);
	}
</style>
