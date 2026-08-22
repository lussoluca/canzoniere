<script lang="ts">
	import type { Song, Line, Chord } from '$lib/chordpro';
	import { sanitizeChord, isValidChord } from '$lib/chords';

	interface Props {
		song: Song;
		usedChords?: string[];
		// display-only transform for the chord pills (e.g. simplification)
		displayChord?: (chord: string) => string;
	}

	let { song = $bindable(), usedChords = [], displayChord = (c) => c }: Props = $props();

	// only lyric lines take chords; navigation moves across these
	let lyricIdxs = $derived(
		song.lines.map((l, i) => (l.type === 'lyric' ? i : -1)).filter((i) => i >= 0)
	);

	let cursor = $state(0);
	$effect(() => {
		if (cursor >= lyricIdxs.length) cursor = Math.max(0, lyricIdxs.length - 1);
	});

	let lineIdx = $derived(lyricIdxs[cursor]);
	let line = $derived(
		lineIdx === undefined
			? undefined
			: (song.lines[lineIdx] as { type: 'lyric'; text: string; chords: Chord[] })
	);

	// --- chord palette: chords used in the song plus the ones typed in here ---
	let extra: string[] = $state([]);
	let palette = $derived([...usedChords, ...extra.filter((c) => !usedChords.includes(c))]);
	let selected: string | null = $state(null);
	let newChord = $state('');
	let newChordError = $state(false);

	function addToPalette() {
		const v = sanitizeChord(newChord);
		if (v === '') return;
		if (!isValidChord(v)) {
			newChordError = true;
			return;
		}
		if (!palette.includes(v)) extra.push(v);
		selected = v;
		newChord = '';
	}

	// --- drag a chip from the palette onto a character of the line ---
	let textRowEl: HTMLElement | undefined = $state();

	function charWidth(): number {
		const char = textRowEl?.querySelector('.char');
		return char ? char.getBoundingClientRect().width : 11;
	}

	// the position under the pointer, or null when the pointer is far from the line
	function posAt(clientX: number, clientY: number): number | null {
		if (!textRowEl || !line) return null;
		const rect = textRowEl.getBoundingClientRect();
		// generous vertical tolerance: the finger hides the drop target
		if (clientY < rect.top - 60 || clientY > rect.bottom + 30) return null;
		const pos = Math.round((clientX - rect.left) / charWidth());
		return Math.max(0, Math.min(line.text.length, pos));
	}

	let chipDrag: { chord: string; x: number; y: number; moved: boolean } | null = $state(null);
	let dropPos: number | null = $state(null);

	function chipPointerDown(e: PointerEvent, chord: string) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		chipDrag = { chord, x: e.clientX, y: e.clientY, moved: false };
	}

	function chipPointerMove(e: PointerEvent) {
		if (!chipDrag) return;
		if (Math.abs(e.clientX - chipDrag.x) + Math.abs(e.clientY - chipDrag.y) > 6)
			chipDrag.moved = true;
		chipDrag.x = e.clientX;
		chipDrag.y = e.clientY;
		if (chipDrag.moved) dropPos = posAt(e.clientX, e.clientY);
	}

	function chipPointerUp(chord: string) {
		if (chipDrag?.moved) {
			if (dropPos !== null && line) {
				line.chords.push({ pos: dropPos, chord });
			}
		} else {
			// a plain tap arms the chord: the next tap on a character places it
			selected = selected === chord ? null : chord;
		}
		chipDrag = null;
		dropPos = null;
	}

	// tap on a character: place the armed chord there
	function placeAt(pos: number) {
		if (!line || !selected) return;
		line.chords.push({ pos, chord: selected });
	}

	// --- edit/move the pills already on the line (same gestures as the full editor) ---
	let pillDrag: { idx: number; startX: number; startPos: number; moved: boolean } | null = null;

	function pillPointerDown(e: PointerEvent, idx: number) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		pillDrag = { idx, startX: e.clientX, startPos: line!.chords[idx].pos, moved: false };
	}

	function pillPointerMove(e: PointerEvent) {
		if (!pillDrag || !line) return;
		const delta = Math.round((e.clientX - pillDrag.startX) / charWidth());
		if (delta !== 0) pillDrag.moved = true;
		line.chords[pillDrag.idx].pos = Math.max(
			0,
			Math.min(line.text.length, pillDrag.startPos + delta)
		);
	}

	function pillPointerUp(idx: number) {
		const wasDrag = pillDrag?.moved;
		pillDrag = null;
		if (!wasDrag) openEditChord(idx);
	}

	// --- popover to change or remove an existing chord ---
	let editingIdx: number | null = $state(null);
	let chordInput = $state('');
	let chordError = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	function openEditChord(idx: number) {
		editingIdx = idx;
		chordInput = line!.chords[idx].chord;
		chordError = false;
		queueMicrotask(() => inputEl?.select());
	}

	function commitChord() {
		if (editingIdx === null || !line) return;
		const value = sanitizeChord(chordInput);
		if (value !== '' && !isValidChord(value)) {
			chordError = true;
			inputEl?.focus();
			return;
		}
		if (value === '') {
			line.chords.splice(editingIdx, 1);
		} else {
			line.chords[editingIdx].chord = value;
		}
		closePopover();
	}

	function removeChord() {
		if (editingIdx !== null && line) line.chords.splice(editingIdx, 1);
		closePopover();
	}

	function closePopover() {
		editingIdx = null;
		chordInput = '';
		chordError = false;
	}

	// --- inline lyric text editing ---
	let editingText = $state(false);
	let textDraft = $state('');
	let textInputEl: HTMLInputElement | undefined = $state();

	function startTextEdit() {
		if (!line) return;
		textDraft = line.text;
		editingText = true;
		queueMicrotask(() => textInputEl?.focus());
	}

	function commitTextEdit() {
		if (!editingText || !line) return;
		line.text = textDraft;
		for (const c of line.chords) c.pos = Math.min(c.pos, line.text.length);
		editingText = false;
	}

	// pills anchor at their character position, nudged right when they would overlap
	const sortedChords = $derived.by(() => {
		if (!line) return [];
		const sorted = line.chords.map((c, idx) => ({ ...c, idx })).sort((a, b) => a.pos - b.pos);
		let minLeft = 0;
		return sorted.map((c) => {
			const label = displayChord(c.chord);
			const left = Math.max(c.pos, minLeft);
			minLeft = left + label.length * 0.85 + 0.8;
			return { ...c, label, left };
		});
	});

	// compact preview of the neighbouring lines, for context around the current one
	function preview(l: Line | undefined): string {
		if (!l) return '';
		switch (l.type) {
			case 'lyric':
				return l.text;
			case 'comment':
				return l.text;
			case 'chorus_start':
				return '▼ ritornello';
			case 'chorus_end':
				return '▲ fine ritornello';
			case 'tab':
				return '(tablatura)';
			default:
				return '';
		}
	}
</script>

<div class="focus-editor" data-testid="line-mode">
	<div class="palette" data-testid="chord-palette">
		<div class="chips">
			{#if palette.length === 0}
				<span class="palette-hint">Aggiungi un accordo qui a destra, poi trascinalo sul testo</span>
			{/if}
			{#each palette as chord (chord)}
				<button
					class="chip"
					class:selected={selected === chord}
					class:dragging={chipDrag?.chord === chord && chipDrag.moved}
					onpointerdown={(e) => chipPointerDown(e, chord)}
					onpointermove={chipPointerMove}
					onpointerup={() => chipPointerUp(chord)}
					title="Trascina sul testo, oppure tocca e poi tocca la posizione"
					data-testid="palette-chip"
				>
					{displayChord(chord)}
				</button>
			{/each}
		</div>
		<form
			class="add-chord"
			onsubmit={(e) => {
				e.preventDefault();
				addToPalette();
			}}
		>
			<input
				bind:value={newChord}
				oninput={() => (newChordError = false)}
				class:invalid={newChordError}
				placeholder="Nuovo…"
				title={newChordError ? 'Accordo non valido' : 'Aggiungi un accordo all’elenco'}
				data-testid="palette-add-input"
			/>
			<button type="submit" title="Aggiungi all’elenco" data-testid="palette-add">＋</button>
		</form>
	</div>

	{#if !line}
		<p class="hint">
			Nessuna riga di testo. Incolla il testo nella scheda «ChordPro», poi torna qui per aggiungere
			gli accordi riga per riga.
		</p>
	{:else}
		<div class="stage">
			<div class="context" data-testid="context-prev">{preview(song.lines[lineIdx - 1])}</div>

			<div class="focus-line" data-testid="focus-line">
				<div class="chord-row">
					{#each sortedChords as c (c.idx)}
						<span class="chord-anchor" style={`left: ${c.left}ch`}>
							<button
								class="chord-pill"
								title="Tocca per modificare, trascina per spostare"
								data-testid="focus-pill"
								data-pos={c.pos}
								onpointerdown={(e) => pillPointerDown(e, c.idx)}
								onpointermove={pillPointerMove}
								onpointerup={() => pillPointerUp(c.idx)}
							>
								{c.label}
							</button>
						</span>
					{/each}
					{#if editingIdx !== null}
						<div class="chord-popover" data-testid="focus-chord-popover">
							<input
								bind:this={inputEl}
								bind:value={chordInput}
								oninput={() => (chordError = false)}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										commitChord();
									} else if (e.key === 'Escape') closePopover();
								}}
								class:invalid={chordError}
								placeholder="Accordo"
								data-testid="focus-chord-input"
							/>
							<button class="ok" onclick={commitChord} data-testid="focus-chord-save" title="Conferma">
								✓
							</button>
							<button class="del" onclick={removeChord} data-testid="focus-chord-remove" title="Rimuovi">
								✕
							</button>
							<button class="cancel" onclick={closePopover} title="Annulla">esc</button>
						</div>
					{/if}
				</div>

				{#if editingText}
					<input
						class="text-edit"
						bind:this={textInputEl}
						bind:value={textDraft}
						onkeydown={(e) => {
							if (e.key === 'Enter') commitTextEdit();
							else if (e.key === 'Escape') editingText = false;
						}}
						onblur={commitTextEdit}
						data-testid="focus-text-input"
					/>
				{:else}
					<div class="text-row" bind:this={textRowEl} data-testid="focus-text">
						{#each line.text.split('') as ch, i (i)}
							<button
								class="char"
								class:drop={dropPos === i}
								class:armed={selected !== null}
								data-pos={i}
								onclick={() => placeAt(i)}
								title={selected ? `Inserisci ${selected} qui` : undefined}
							>
								{#if ch === ' '}&nbsp;{:else}{ch}{/if}
							</button>
						{/each}
						<button
							class="char tail"
							class:drop={dropPos === line.text.length}
							class:armed={selected !== null}
							data-pos={line.text.length}
							onclick={() => placeAt(line.text.length)}
							title={selected ? `Inserisci ${selected} a fine riga` : undefined}
						>
							&nbsp;
						</button>
						<button
							class="edit-text"
							onclick={startTextEdit}
							title="Modifica testo"
							data-testid="focus-edit-text"
						>
							✎
						</button>
					</div>
				{/if}
			</div>

			<div class="context" data-testid="context-next">{preview(song.lines[lineIdx + 1])}</div>
		</div>

		<div class="nav">
			<span class="counter" data-testid="line-counter">{cursor + 1} / {lyricIdxs.length}</span>
			<button
				class="nav-btn"
				onclick={() => (cursor = Math.max(0, cursor - 1))}
				disabled={cursor === 0}
				title="Riga precedente"
				data-testid="prev-line"
			>
				‹
			</button>
			<button
				class="nav-btn primary"
				onclick={() => (cursor = Math.min(lyricIdxs.length - 1, cursor + 1))}
				disabled={cursor >= lyricIdxs.length - 1}
				title="Riga successiva"
				data-testid="next-line"
			>
				Avanti ›
			</button>
		</div>
	{/if}

	{#if chipDrag?.moved}
		<div class="ghost" style={`left: ${chipDrag.x}px; top: ${chipDrag.y}px`}>
			{displayChord(chipDrag.chord)}
		</div>
	{/if}
</div>

<style>
	.focus-editor {
		background: #fff;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		padding: 0.6rem 0.8rem 0.8rem;
	}
	.palette {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #eee;
	}
	.chips {
		display: flex;
		gap: 0.4rem;
		overflow-x: auto;
		flex: 1;
		padding: 0.2rem 0;
		-webkit-overflow-scrolling: touch;
	}
	.palette-hint {
		color: #999;
		font-size: 0.8rem;
		white-space: nowrap;
	}
	.chip {
		flex-shrink: 0;
		border: none;
		border-radius: 6px;
		background: #e8edf0;
		color: #2f3e46;
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 1rem;
		font-weight: 700;
		padding: 0.35rem 0.6rem;
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.chip.selected {
		background: #2f3e46;
		color: #ffd166;
	}
	.chip.dragging {
		opacity: 0.4;
	}
	.add-chord {
		display: flex;
		gap: 0.2rem;
		flex-shrink: 0;
	}
	.add-chord input {
		width: 5.5rem;
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.95rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		padding: 0.3rem 0.4rem;
	}
	.add-chord input.invalid {
		border-color: #e5383b;
		background: #fbeae9;
	}
	.add-chord button {
		border: none;
		background: #eee;
		border-radius: 6px;
		cursor: pointer;
		font-size: 1.05rem;
		line-height: 1;
		padding: 0.3rem 0.55rem;
		color: #666;
	}
	.hint {
		color: #999;
		padding: 1rem 0;
	}
	.stage {
		padding: 0.8rem 0 0.4rem;
	}
	.context {
		color: #bbb;
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 0.85rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-height: 1.3em;
	}
	.focus-line {
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 20px;
		line-height: 1.3;
		margin: 0.3rem 0;
		overflow-x: auto;
		padding-bottom: 2px;
	}
	.chord-row {
		position: relative;
		height: 1.5em;
	}
	.chord-anchor {
		position: absolute;
		top: 0.1em;
		z-index: 2;
	}
	.chord-pill {
		display: inline-block;
		background: #2f3e46;
		color: #ffd166;
		font-family: inherit;
		font-size: 0.85em;
		font-weight: 700;
		border: none;
		border-radius: 4px;
		padding: 0 0.35em;
		margin-left: -0.35em;
		cursor: grab;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.chord-popover {
		position: absolute;
		top: -0.2em;
		left: 0;
		display: flex;
		gap: 4px;
		background: #fff;
		border: 1px solid #2f3e46;
		border-radius: 6px;
		padding: 4px;
		z-index: 5;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		font-size: 0.8em;
	}
	.chord-popover input {
		width: 7ch;
		font-family: inherit;
		font-size: 1em;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 2px 4px;
	}
	.chord-popover input.invalid {
		border-color: #e5383b;
		background: #fbeae9;
	}
	.chord-popover button {
		border: none;
		border-radius: 4px;
		cursor: pointer;
		padding: 2px 8px;
	}
	.chord-popover .ok {
		background: #d8f3dc;
	}
	.chord-popover .del {
		background: #fbeae9;
	}
	.chord-popover .cancel {
		background: #eee;
	}
	.text-row {
		white-space: nowrap;
	}
	.char {
		display: inline-block;
		font: inherit;
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		width: 1ch;
	}
	.char.armed {
		border-bottom: 2px dotted #ffd166;
	}
	.char.drop {
		background: #ffd166;
		border-radius: 2px;
	}
	.edit-text {
		border: none;
		background: none;
		cursor: pointer;
		color: #bbb;
		font-size: 1.1em;
		padding: 0 0.2em;
		line-height: 1;
	}
	.text-edit {
		font: inherit;
		width: 100%;
		border: 1px solid #2f3e46;
		border-radius: 4px;
		padding: 1px 4px;
	}
	.nav {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.5rem;
		padding-top: 0.4rem;
		border-top: 1px solid #eee;
	}
	.counter {
		color: #999;
		font-size: 0.85rem;
		margin-right: auto;
	}
	.nav-btn {
		border: none;
		border-radius: 8px;
		background: #eee;
		color: #444;
		font-size: 1.1rem;
		line-height: 1;
		padding: 0.55rem 0.9rem;
		cursor: pointer;
	}
	.nav-btn.primary {
		background: #2f3e46;
		color: #ffd166;
		font-weight: 600;
	}
	.nav-btn:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.ghost {
		position: fixed;
		z-index: 100;
		transform: translate(-50%, -130%);
		background: #2f3e46;
		color: #ffd166;
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-weight: 700;
		font-size: 1.05rem;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		pointer-events: none;
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
	}
</style>
