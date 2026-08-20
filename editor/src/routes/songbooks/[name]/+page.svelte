<script lang="ts">
	import { base } from '$app/paths';
	import { categoryLabel } from '$lib/categories';

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
			const res = await fetch(`${base}/api/songbooks/${encodeURIComponent(data.name)}`, {
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

<nav class="crumbs"><a href="{base}/songbooks">Canzonieri</a> / {data.name}</nav>

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
							{song.title}
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
		font-size: 0.9rem;
		color: #777;
		margin-bottom: 0.8rem;
	}
	.crumbs a {
		color: #2f3e46;
	}
	.head {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-bottom: 0.8rem;
	}
	.head h2 {
		margin: 0;
		flex: 1;
	}
	.status {
		font-size: 0.85rem;
		color: #2d6a4f;
	}
	.cols {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		align-items: start;
	}
	.panel {
		background: #fff;
		border-radius: 8px;
		padding: 0.9rem 1.1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	.panel h3 {
		margin: 0 0 0.6rem;
		font-size: 0.95rem;
	}
	ol {
		margin: 0;
		padding-left: 1.4rem;
	}
	ol li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0;
		border-bottom: 1px solid #f2f2f2;
	}
	ol li .title {
		flex: 1;
	}
	.cat {
		color: #999;
		margin-left: 0.3rem;
	}
	.missing {
		color: #b3261e;
	}
	.entry-actions button {
		border: none;
		background: #eee;
		border-radius: 4px;
		cursor: pointer;
		padding: 1px 7px;
		font-size: 0.8rem;
		color: #555;
	}
	.entry-actions button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.entry-actions .remove {
		background: #fbeae9;
		color: #b3261e;
	}
	.empty {
		color: #999;
		border: none;
	}
	input[type='search'] {
		width: 100%;
		padding: 0.45rem 0.7rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		margin-bottom: 0.5rem;
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
		padding: 0.3rem 0.2rem;
		cursor: pointer;
		border-radius: 4px;
		font-size: 0.92rem;
	}
	.picker .add:hover {
		background: #eef3f4;
	}
</style>
