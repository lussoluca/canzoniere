<script lang="ts">
	import { onMount } from 'svelte';
	import { goto, beforeNavigate } from '$app/navigation';
	import { parse, serialize, type Song, type Line } from '$lib/chordpro';
	import { categoryLabel } from '$lib/categories';
	import { englishChordToLatin, simplifyChord, transposeChord } from '$lib/chords';
	import { slugify } from '$lib/slug';
	import ChordProEditor from './ChordProEditor.svelte';
	import LyricLineEditor from './LyricLineEditor.svelte';
	import ChordDiagram from '../../../../shared/ChordDiagram.svelte';

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

	// snapshot of the content as it lives on disk; updated on every successful save
	let savedContent = $state(serialize(initial));

	// the song serialized in its current state, regardless of the active tab
	let currentContent = $derived.by(() => {
		if (tab === 'raw') {
			const parsed = parse(raw);
			return serialize({ meta: parsed.meta, lines: parsed.lines });
		}
		return serialize(song);
	});

	let dirty = $derived(currentContent !== savedContent || category !== savedCategory);

	// --- undo/redo: snapshot history of the whole document ---
	type Snapshot = { content: string; category: string };
	const HISTORY_LIMIT = 50;
	let history: Snapshot[] = $state([{ content: serialize(initial), category: initialCategory }]);
	let histIdx = $state(0);
	// true while restoring a snapshot, so the capture effect ignores the change it causes
	let restoring = false;
	let captureTimer: ReturnType<typeof setTimeout> | null = null;

	let canUndo = $derived(histIdx > 0);
	let canRedo = $derived(histIdx < history.length - 1);

	function pushHistory(snap: Snapshot) {
		const top = history[histIdx];
		if (snap.content === top.content && snap.category === top.category) return;
		// drop any redo branch, then append
		let next = history.slice(0, histIdx + 1);
		next.push(snap);
		if (next.length > HISTORY_LIMIT) next = next.slice(next.length - HISTORY_LIMIT);
		history = next;
		histIdx = history.length - 1;
	}

	// commit any pending debounced capture immediately (used before structural edits/saves)
	function flushCapture() {
		if (!captureTimer) return;
		clearTimeout(captureTimer);
		captureTimer = null;
		pushHistory({ content: currentContent, category });
	}

	// debounced capture: coalesces a burst of keystrokes into a single history entry
	$effect(() => {
		const snapshot = { content: currentContent, category };
		if (restoring) {
			restoring = false;
			return;
		}
		const top = history[histIdx];
		if (snapshot.content === top.content && snapshot.category === top.category) return;
		if (captureTimer) clearTimeout(captureTimer);
		captureTimer = setTimeout(() => {
			captureTimer = null;
			pushHistory(snapshot);
		}, 400);
	});

	function restoreTo(idx: number) {
		if (idx < 0 || idx >= history.length) return;
		if (captureTimer) {
			clearTimeout(captureTimer);
			captureTimer = null;
		}
		restoring = true;
		histIdx = idx;
		const snap = history[idx];
		const parsed = parse(snap.content);
		song = { meta: parsed.meta, lines: parsed.lines };
		category = snap.category;
		if (tab === 'raw') raw = snap.content;
	}

	function undo() {
		if (canUndo) restoreTo(histIdx - 1);
	}
	function redo() {
		if (canRedo) restoreTo(histIdx + 1);
	}

	beforeNavigate(({ cancel }) => {
		if (dirty && !confirm('Ci sono modifiche non salvate. Vuoi davvero uscire?')) {
			cancel();
		}
	});

	onMount(() => {
		const handler = (e: BeforeUnloadEvent) => {
			if (dirty) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener('beforeunload', handler);

		const keyHandler = (e: KeyboardEvent) => {
			if (!(e.metaKey || e.ctrlKey)) return;
			const k = e.key.toLowerCase();
			if (k === 'z' && !e.shiftKey) {
				e.preventDefault();
				undo();
			} else if ((k === 'z' && e.shiftKey) || k === 'y') {
				e.preventDefault();
				redo();
			}
		};
		window.addEventListener('keydown', keyHandler);

		return () => {
			window.removeEventListener('beforeunload', handler);
			window.removeEventListener('keydown', keyHandler);
		};
	});

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
		flushCapture();
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

	// unique chords in order of first appearance, same criterion ChordPro uses
	// for the diagrams in the PDF (diagrams.sorted = false)
	let usedChords = $derived.by(() => {
		const seen = new Set<string>();
		const out: string[] = [];
		for (const line of song.lines) {
			if (line.type !== 'lyric') continue;
			for (const c of line.chords) {
				if (!c.chord || seen.has(c.chord)) continue;
				seen.add(c.chord);
				out.push(c.chord);
			}
		}
		return out;
	});

	// simplification is a display mode: pills and diagrams show the reduced
	// triads, the song (and the saved file) keeps the original chords
	let simplify = $state(false);
	let displayChord = $derived(simplify ? simplifyChord : (c: string) => c);
	let panelChords = $derived(simplify ? [...new Set(usedChords.map(simplifyChord))] : usedChords);

	function addLine(afterIdx: number | null, line: Line) {
		flushCapture();
		if (afterIdx === null) {
			song.lines.push(line);
		} else {
			song.lines.splice(afterIdx + 1, 0, line);
		}
	}

	// the kinds of line the add menu can insert
	const lineTypes: { label: string; testid: string; make: () => Line }[] = [
		{ label: 'riga di testo', testid: 'add-lyric', make: () => ({ type: 'lyric', text: '', chords: [] }) },
		{ label: 'riga vuota', testid: 'add-empty', make: () => ({ type: 'empty' }) },
		{ label: 'commento', testid: 'add-comment', make: () => ({ type: 'comment', text: '' }) },
		{ label: 'inizio ritornello', testid: 'add-chorus-start', make: () => ({ type: 'chorus_start' }) },
		{ label: 'fine ritornello', testid: 'add-chorus-end', make: () => ({ type: 'chorus_end' }) }
	];

	// which add menu is open: a line index (insert below that line) or 'end' (append)
	let openAddMenu: number | 'end' | null = $state(null);

	function deleteLine(idx: number) {
		flushCapture();
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
				savedContent = content;
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
				savedContent = content;
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

<svelte:window onclick={() => (openAddMenu = null)} />

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
	<label title="Velocità iniziale dello scorrimento automatico nel reader (1–10). Vuoto = predefinito.">
		Scorrimento
		<input
			type="number"
			min="1"
			max="10"
			placeholder="auto"
			value={song.meta.scroll ?? ''}
			oninput={(e) => {
				const v = parseInt(e.currentTarget.value, 10);
				song.meta.scroll = Number.isNaN(v) ? null : Math.min(10, Math.max(1, v));
			}}
			data-testid="meta-scroll"
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
	<span class="history-tools">
		<button
			class="btn"
			onclick={undo}
			disabled={!canUndo}
			title="Annulla (Ctrl+Z)"
			data-testid="undo"
		>
			↶
		</button>
		<button
			class="btn"
			onclick={redo}
			disabled={!canRedo}
			title="Ripeti (Ctrl+Shift+Z)"
			data-testid="redo"
		>
			↷
		</button>
	</span>
	<span class="spacer"></span>
	<span class="chord-tools">
		Accordi:
		<button
			class="btn"
			class:toggled={simplify}
			onclick={() => (simplify = !simplify)}
			aria-pressed={simplify}
			title="Mostra gli accordi semplificati (triadi di base). Non modifica la canzone."
			data-testid="simplify-toggle"
		>
			Semplifica
		</button>
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
	{#if dirty}
		<span class="dirty" data-testid="dirty-indicator" title="Ci sono modifiche non salvate">
			● Modifiche non salvate
		</span>
	{/if}
	<span class="status" data-testid="save-status">{status}</span>
	<button class="btn primary" onclick={save} disabled={saving || !dirty} data-testid="save">
		{mode === 'new' ? 'Crea' : 'Salva'}
	</button>
</div>

{#snippet addMenu(afterIdx: number | null, key: number | 'end')}
	<span class="add-menu">
		<button
			onclick={(e) => {
				e.stopPropagation();
				openAddMenu = openAddMenu === key ? null : key;
			}}
			title="Aggiungi riga"
			data-testid={key === 'end' ? 'add-line-end' : 'add-line-below'}
		>
			＋
		</button>
		{#if openAddMenu === key}
			<div class="menu" data-testid="add-line-menu">
				{#each lineTypes as t (t.testid)}
					<button
						onclick={() => {
							addLine(afterIdx, t.make());
							openAddMenu = null;
						}}
						data-testid={t.testid}
					>
						{t.label}
					</button>
				{/each}
			</div>
		{/if}
	</span>
{/snippet}

{#if tab === 'visual'}
	<div class="visual-layout">
	<div class="sheet" data-testid="visual-editor">
		{#if song.lines.length === 0}
			<p class="hint">
				Nessun testo. Aggiungi righe qui sotto oppure incolla il testo nella scheda «ChordPro».
			</p>
		{/if}
		{#each song.lines as line, idx (line)}
			<div class="line-wrap" class:in-chorus={false}>
				<div class="line-tools" class:open={openAddMenu === idx}>
					<button onclick={() => deleteLine(idx)} title="Elimina riga" data-testid="delete-line">✕</button>
					{@render addMenu(idx, idx)}
				</div>
				<div class="line-body">
					{#if line.type === 'lyric'}
						<LyricLineEditor bind:line={song.lines[idx] as typeof line} {usedChords} {displayChord} />
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
			{@render addMenu(null, 'end')}
		</div>
	</div>

	<aside class="chords-panel" data-testid="chord-diagrams">
		<h3>Accordi</h3>
		{#if panelChords.length === 0}
			<p class="no-chords">Nessun accordo</p>
		{:else}
			{#each panelChords as chord (chord)}
				<ChordDiagram name={chord} />
			{/each}
		{/if}
	</aside>
	</div>
{:else}
	<ChordProEditor bind:value={raw} />
{/if}

<style>
	.meta {
		display: grid;
		grid-template-columns: 2.3fr 2.3fr 0.8fr 1fr 1.4fr;
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
	.history-tools {
		display: flex;
		gap: 0.2rem;
		margin-left: 0.4rem;
	}
	.history-tools button {
		font-size: 1rem;
		line-height: 1;
		padding: 0.3rem 0.5rem;
	}
	.chord-tools {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.82rem;
		color: #777;
		margin-right: 0.6rem;
	}
	.chord-tools .toggled {
		background: #2f3e46;
		color: #ffd166;
	}
	.status {
		font-size: 0.85rem;
		color: #2d6a4f;
	}
	.dirty {
		font-size: 0.82rem;
		color: #b54708;
		font-weight: 600;
		white-space: nowrap;
	}
	.visual-layout {
		display: flex;
		gap: 0.8rem;
		align-items: flex-start;
	}
	.sheet {
		flex: 1;
		min-width: 0;
		background: #fff;
		border-radius: 8px;
		padding: 1rem 1.2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		overflow-x: auto;
	}
	.chords-panel {
		position: sticky;
		top: 0.5rem;
		flex-shrink: 0;
		width: 140px;
		max-height: calc(100vh - 1rem);
		overflow-y: auto;
		background: #fff;
		border-radius: 8px;
		padding: 0.8rem 0.6rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.chords-panel h3 {
		margin: 0;
		font-size: 0.78rem;
		color: #777;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.no-chords {
		color: #999;
		font-size: 0.82rem;
		margin: 0;
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
		gap: 3px;
		visibility: hidden;
		width: 3.6rem;
		flex-direction: row;
	}
	.line-wrap:hover .line-tools,
	.line-tools.open {
		visibility: visible;
	}
	.line-tools > button,
	.add-menu > button {
		border: none;
		background: #eee;
		border-radius: 4px;
		cursor: pointer;
		font-size: 1.05rem;
		line-height: 1;
		padding: 3px 7px;
		color: #666;
	}
	.line-tools > button:hover,
	.add-menu > button:hover {
		background: #ddd;
	}
	.add-menu {
		position: relative;
		display: inline-flex;
	}
	.menu {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 2px;
		z-index: 10;
		display: flex;
		flex-direction: column;
		min-width: 9.5rem;
		padding: 0.2rem;
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
	.menu button {
		border: none;
		background: none;
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
		white-space: nowrap;
		padding: 0.35rem 0.6rem;
		font-size: 0.85rem;
		color: #333;
	}
	.menu button:hover {
		background: #f0f0f0;
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
		align-items: center;
	}
</style>
