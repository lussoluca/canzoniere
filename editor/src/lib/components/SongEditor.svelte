<script lang="ts">
	import { goto } from '$app/navigation';
	import { parse, serialize, type Song, type Line } from '$lib/chordpro';
	import { categoryLabel } from '$lib/categories';
	import { englishChordToLatin, transposeChord } from '$lib/chords';
	import { slugify } from '$lib/slug';
	import ChordProEditor from './ChordProEditor.svelte';
	import LyricLineEditor from './LyricLineEditor.svelte';

	interface Props {
		initial: Song;
		categories: string[];
		mode: 'new' | 'edit';
		category: string;
		file?: string;
	}

	let { initial, categories, mode, category: initialCategory, file }: Props = $props();

	let song: Song = $state(initial);
	let category = $state(initialCategory);
	let savedCategory = $state(initialCategory); // category the file currently lives in on disk
	let tab: 'visual' | 'raw' = $state('visual');
	let raw = $state('');
	let status = $state('');
	let saving = $state(false);

	// the {tag:...} directive mirrors the category (the PDF TOC groups songs by tag)
	function syncTagToCategory() {
		song.meta.tags = [categoryLabel(category)];
	}

	function switchTab(next: 'visual' | 'raw') {
		if (next === tab) return;
		if (next === 'raw') {
			syncTagToCategory();
			raw = serialize(song);
		} else {
			const parsed = parse(raw);
			song.meta = parsed.meta;
			song.lines = parsed.lines;
		}
		tab = next;
	}

	// apply a transformation to every chord of the song, in whichever tab is active
	function applyToChords(fn: (chord: string) => string) {
		if (tab === 'raw') {
			const parsed = parse(raw);
			song.meta = parsed.meta;
			song.lines = parsed.lines;
		}
		for (const line of song.lines) {
			if (line.type === 'lyric') {
				for (const c of line.chords) c.chord = fn(c.chord);
			}
		}
		if (tab === 'raw') raw = serialize(song);
	}

	function addLine(afterIdx: number | null, line: Line) {
		if (afterIdx === null) {
			song.lines.push(line);
		} else {
			song.lines.splice(afterIdx + 1, 0, line);
		}
	}

	function deleteLine(idx: number) {
		song.lines.splice(idx, 1);
	}

	async function save() {
		if (tab === 'raw') {
			const parsed = parse(raw);
			song.meta = parsed.meta;
			song.lines = parsed.lines;
		}
		if (!song.meta.title.trim()) {
			status = 'Il titolo è obbligatorio';
			return;
		}
		syncTagToCategory();
		const content = serialize(song);
		saving = true;
		status = '';
		try {
			if (mode === 'edit' && file) {
				const moved = category !== savedCategory;
				if (moved) {
					const res = await fetch(
						`/api/songs/${encodeURIComponent(savedCategory)}/${encodeURIComponent(file)}`,
						{
							method: 'PATCH',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ category })
						}
					);
					if (!res.ok) throw new Error(await res.text());
					savedCategory = category;
				}
				const res = await fetch(
					`/api/songs/${encodeURIComponent(category)}/${encodeURIComponent(file)}`,
					{
						method: 'PUT',
						headers: { 'content-type': 'application/json' },
						body: JSON.stringify({ content })
					}
				);
				if (!res.ok) throw new Error(await res.text());
				status = 'Salvato ✓';
				if (moved) {
					await goto(`/edit/${encodeURIComponent(category)}/${encodeURIComponent(file)}`);
				}
			} else {
				const newFile = slugify(song.meta.title) + '.cho';
				const res = await fetch('/api/songs', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ category, file: newFile, content })
				});
				if (!res.ok) throw new Error(await res.text());
				status = 'Creato ✓';
				await goto(`/edit/${encodeURIComponent(category)}/${encodeURIComponent(newFile)}`);
			}
		} catch (e) {
			status = `Errore: ${e instanceof Error ? e.message : e}`;
		} finally {
			saving = false;
		}
	}
</script>

<div class="meta" data-testid="meta-form">
	<label>
		Titolo
		<input bind:value={song.meta.title} data-testid="meta-title" />
	</label>
	<label>
		Artista
		<input bind:value={song.meta.artist} data-testid="meta-artist" />
	</label>
	<label>
		Colonne
		<input
			type="number"
			min="1"
			max="4"
			value={song.meta.columns ?? ''}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				song.meta.columns = Number.isNaN(v) ? null : v;
			}}
			data-testid="meta-columns"
		/>
	</label>
	<label>
		Categoria
		<select bind:value={category} data-testid="meta-category">
			{#each categories as c (c)}
				<option value={c}>{categoryLabel(c)}</option>
			{/each}
		</select>
	</label>
</div>

<div class="tabs">
	<button class:active={tab === 'visual'} onclick={() => switchTab('visual')} data-testid="tab-visual">
		Editor visuale
	</button>
	<button class:active={tab === 'raw'} onclick={() => switchTab('raw')} data-testid="tab-raw">
		ChordPro
	</button>
	<span class="spacer"></span>
	<span class="chord-tools">
		Accordi:
		<button
			class="btn"
			onclick={() => applyToChords(englishChordToLatin)}
			title="Converti gli accordi da notazione inglese (A, B, C) a latina (La, Si, Do)"
			data-testid="convert-latin"
		>
			A→La
		</button>
		<button
			class="btn"
			onclick={() => applyToChords((c) => transposeChord(c, -1))}
			title="Trasponi tutti gli accordi di un semitono in giù"
			data-testid="transpose-down"
		>
			−1
		</button>
		<button
			class="btn"
			onclick={() => applyToChords((c) => transposeChord(c, 1))}
			title="Trasponi tutti gli accordi di un semitono in su"
			data-testid="transpose-up"
		>
			+1
		</button>
	</span>
	<span class="status" data-testid="save-status">{status}</span>
	<button class="btn primary" onclick={save} disabled={saving} data-testid="save">
		{mode === 'new' ? 'Crea' : 'Salva'}
	</button>
</div>

{#if tab === 'visual'}
	<div class="sheet" data-testid="visual-editor">
		{#if song.lines.length === 0}
			<p class="hint">
				Nessun testo. Aggiungi righe qui sotto oppure incolla il testo nella scheda «ChordPro».
			</p>
		{/if}
		{#each song.lines as line, idx (line)}
			<div class="line-wrap" class:in-chorus={false}>
				<div class="line-tools">
					<button onclick={() => deleteLine(idx)} title="Elimina riga" data-testid="delete-line">✕</button>
					<button
						onclick={() => addLine(idx, { type: 'lyric', text: '', chords: [] })}
						title="Aggiungi riga sotto"
						data-testid="add-line-below"
					>
						＋
					</button>
				</div>
				<div class="line-body">
					{#if line.type === 'lyric'}
						<LyricLineEditor bind:line={song.lines[idx] as typeof line} />
					{:else if line.type === 'empty'}
						<div class="empty-line"></div>
					{:else if line.type === 'chorus_start'}
						<div class="marker">▼ ritornello</div>
					{:else if line.type === 'chorus_end'}
						<div class="marker">▲ fine ritornello</div>
					{:else if line.type === 'comment'}
						<input class="comment" bind:value={line.text} placeholder="Commento…" />
					{:else}
						<code class="directive">{line.raw}</code>
					{/if}
				</div>
			</div>
		{/each}

		<div class="add-bar">
			Aggiungi:
			<button class="btn" onclick={() => addLine(null, { type: 'lyric', text: '', chords: [] })} data-testid="add-lyric">
				riga di testo
			</button>
			<button class="btn" onclick={() => addLine(null, { type: 'empty' })} data-testid="add-empty">
				riga vuota
			</button>
			<button class="btn" onclick={() => addLine(null, { type: 'comment', text: '' })} data-testid="add-comment">
				commento
			</button>
			<button class="btn" onclick={() => addLine(null, { type: 'chorus_start' })} data-testid="add-chorus-start">
				inizio ritornello
			</button>
			<button class="btn" onclick={() => addLine(null, { type: 'chorus_end' })} data-testid="add-chorus-end">
				fine ritornello
			</button>
		</div>
	</div>
{:else}
	<ChordProEditor bind:value={raw} />
{/if}

<style>
	.meta {
		display: grid;
		grid-template-columns: 2.5fr 2.5fr 0.8fr 1.4fr;
		gap: 0.6rem;
		background: #fff;
		border-radius: 8px;
		padding: 0.8rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		margin-bottom: 0.8rem;
	}
	.meta label {
		display: flex;
		flex-direction: column;
		font-size: 0.78rem;
		color: #777;
		gap: 0.2rem;
	}
	.meta input,
	.meta select {
		font-size: 0.95rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fff;
	}
	.tabs {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-bottom: 0.6rem;
	}
	.tabs > button:not(.btn) {
		border: none;
		background: none;
		padding: 0.4rem 0.8rem;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		color: #777;
	}
	.tabs > button.active {
		color: #2f3e46;
		font-weight: 600;
		border-bottom-color: #2f3e46;
	}
	.spacer {
		flex: 1;
	}
	.chord-tools {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.82rem;
		color: #777;
		margin-right: 0.6rem;
	}
	.status {
		font-size: 0.85rem;
		color: #2d6a4f;
	}
	.sheet {
		background: #fff;
		border-radius: 8px;
		padding: 1rem 1.2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		overflow-x: auto;
	}
	.hint {
		color: #999;
	}
	.line-wrap {
		display: flex;
		align-items: flex-end;
		gap: 0.3rem;
	}
	.line-tools {
		display: flex;
		flex-direction: column;
		gap: 1px;
		visibility: hidden;
		width: 2.6rem;
		flex-direction: row;
	}
	.line-wrap:hover .line-tools {
		visibility: visible;
	}
	.line-tools button {
		border: none;
		background: #eee;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.7rem;
		padding: 1px 5px;
		color: #666;
	}
	.line-tools button:hover {
		background: #ddd;
	}
	.line-body {
		flex: 1;
		min-width: 0;
	}
	.empty-line {
		height: 1.2em;
	}
	.marker {
		color: #b08900;
		font-size: 0.78rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.2rem 0;
	}
	.comment {
		font-style: italic;
		color: #666;
		border: 1px dashed #ccc;
		border-radius: 4px;
		padding: 0.15rem 0.4rem;
		width: 100%;
		font-size: 0.9rem;
	}
	.directive {
		color: #999;
		font-size: 0.85rem;
	}
	.add-bar {
		margin-top: 1rem;
		padding-top: 0.8rem;
		border-top: 1px solid #eee;
		display: flex;
		gap: 0.4rem;
		align-items: center;
		flex-wrap: wrap;
		font-size: 0.85rem;
		color: #777;
	}
</style>
