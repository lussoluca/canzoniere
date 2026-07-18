<script lang="ts">
	import type { Chord } from '$lib/chordpro';
	import { sanitizeChord, isValidChord } from '$lib/chords';

	interface Props {
		line: { type: 'lyric'; text: string; chords: Chord[] };
		usedChords?: string[];
		// display-only transform for the chord pills (e.g. simplification)
		displayChord?: (chord: string) => string;
	}

	let { line = $bindable(), usedChords = [], displayChord = (c) => c }: Props = $props();

	// --- chord popover state ---
	let editingPos: number | null = $state(null);
	let editingIdx: number | null = $state(null); // index into line.chords when editing an existing chord
	let chordInput = $state('');
	let chordError = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	// --- inline lyric text editing ---
	let editingText = $state(false);
	let textDraft = $state('');
	let textInputEl: HTMLInputElement | undefined = $state();

	let textRowEl: HTMLElement | undefined = $state();

	function charWidth(): number {
		// each character is rendered as a 1ch-wide button; measure one
		const char = textRowEl?.querySelector('.char');
		return char ? char.getBoundingClientRect().width : 8.4;
	}

	function openNewChord(pos: number) {
		editingPos = pos;
		editingIdx = null;
		chordInput = '';
		queueMicrotask(() => inputEl?.focus());
	}

	function openEditChord(idx: number) {
		editingIdx = idx;
		editingPos = line.chords[idx].pos;
		chordInput = line.chords[idx].chord;
		queueMicrotask(() => inputEl?.select());
	}

	function commitChord() {
		const value = sanitizeChord(chordInput);
		if (editingPos === null) return;
		// empty value deletes an existing chord; non-empty must be a valid chord
		if (value !== '' && !isValidChord(value)) {
			chordError = true;
			inputEl?.focus();
			return;
		}
		if (editingIdx !== null) {
			if (value === '') {
				line.chords.splice(editingIdx, 1);
			} else {
				line.chords[editingIdx].chord = value;
			}
		} else if (value !== '') {
			line.chords.push({ pos: editingPos, chord: value });
		}
		closePopover();
	}

	function removeChord() {
		if (editingIdx !== null) line.chords.splice(editingIdx, 1);
		closePopover();
	}

	// insert a chord already used elsewhere in the song with a single click
	function pickChord(chord: string) {
		chordInput = chord;
		commitChord();
	}

	function closePopover() {
		editingPos = null;
		editingIdx = null;
		chordInput = '';
		chordError = false;
	}

	function onChordKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			commitChord();
		} else if (e.key === 'Escape') {
			closePopover();
		}
	}

	// --- drag to reposition chord pills ---
	let drag: { idx: number; startX: number; startPos: number; moved: boolean } | null = null;

	function onPillPointerDown(e: PointerEvent, idx: number) {
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		drag = { idx, startX: e.clientX, startPos: line.chords[idx].pos, moved: false };
	}

	function onPillPointerMove(e: PointerEvent) {
		if (!drag) return;
		const delta = Math.round((e.clientX - drag.startX) / charWidth());
		if (delta !== 0) drag.moved = true;
		line.chords[drag.idx].pos = Math.max(0, Math.min(line.text.length, drag.startPos + delta));
	}

	function onPillPointerUp(idx: number) {
		const wasDrag = drag?.moved;
		drag = null;
		if (!wasDrag) openEditChord(idx);
	}

	// --- lyric text editing ---
	function startTextEdit() {
		textDraft = line.text;
		editingText = true;
		queueMicrotask(() => textInputEl?.focus());
	}

	function commitTextEdit() {
		if (!editingText) return; // already cancelled with Esc
		line.text = textDraft;
		for (const c of line.chords) {
			c.pos = Math.min(c.pos, line.text.length);
		}
		editingText = false;
	}

	function onTextKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			commitTextEdit();
		} else if (e.key === 'Escape') {
			editingText = false; // discard the draft
		}
	}

	// pills anchor at their character position, but are nudged right when they would overlap
	// the previous pill (common in chord-only intro lines like "[Sol] [Do] [Mim]")
	const sortedChords = $derived.by(() => {
		const sorted = line.chords.map((c, idx) => ({ ...c, idx })).sort((a, b) => a.pos - b.pos);
		let minLeft = 0;
		return sorted.map((c) => {
			const label = displayChord(c.chord);
			const left = Math.max(c.pos, minLeft);
			// estimated pill width in parent ch units: 0.85em mono text + padding, plus a small gap
			minLeft = left + label.length * 0.85 + 0.8;
			return { ...c, label, left };
		});
	});
</script>

<div class="lyric-line" data-testid="lyric-line">
	<div class="chord-row" data-testid="chord-row">
		{#each sortedChords as c (c.idx)}
			<!-- anchor span keeps the parent font so `ch` matches the lyric characters -->
			<span class="chord-anchor" style={`left: ${c.left}ch`}>
				<button
					class="chord-pill"
					title="Clicca per modificare, trascina per spostare"
					data-testid="chord-pill"
					data-pos={c.pos}
					onpointerdown={(e) => onPillPointerDown(e, c.idx)}
					onpointermove={onPillPointerMove}
					onpointerup={() => onPillPointerUp(c.idx)}
				>
					{c.label}
				</button>
			</span>
		{/each}
		{#if editingPos !== null}
			<div class="chord-popover" style={`left: ${editingPos}ch`} data-testid="chord-popover">
				<div class="popover-row">
					<input
						bind:this={inputEl}
						bind:value={chordInput}
						oninput={() => (chordError = false)}
						onkeydown={onChordKeydown}
						class:invalid={chordError}
						placeholder="Accordo"
						title={chordError ? 'Accordo non valido' : undefined}
						data-testid="chord-input"
					/>
					<button class="ok" onclick={commitChord} data-testid="chord-save" title="Conferma">✓</button>
					{#if editingIdx !== null}
						<button class="del" onclick={removeChord} data-testid="chord-remove" title="Rimuovi">
							✕
						</button>
					{/if}
					<button class="cancel" onclick={closePopover} title="Annulla">esc</button>
				</div>
				{#if usedChords.length > 0}
					<div class="suggestions" data-testid="chord-suggestions">
						{#each usedChords as c (c)}
							<button
								class="suggestion"
								onclick={() => pickChord(c)}
								title={`Inserisci ${c}`}
								data-testid="chord-suggestion"
							>
								{c}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if editingText}
		<input
			class="text-edit"
			bind:this={textInputEl}
			bind:value={textDraft}
			onkeydown={onTextKeydown}
			onblur={commitTextEdit}
			data-testid="lyric-text-input"
		/>
	{:else}
		<div class="text-row" bind:this={textRowEl} data-testid="lyric-text">
			{#each line.text.split('') as ch, i (i)}
				<button class="char" data-pos={i} onclick={() => openNewChord(i)} title="Aggiungi accordo qui">
					{#if ch === ' '}&nbsp;{:else}{ch}{/if}
				</button>
			{/each}
			<button
				class="char tail"
				data-pos={line.text.length}
				title="Aggiungi accordo a fine riga"
				onclick={() => openNewChord(line.text.length)}
			>
				&nbsp;
			</button>
			<button class="edit-text" onclick={startTextEdit} title="Modifica testo" data-testid="edit-lyric-text">
				✎
			</button>
		</div>
	{/if}
</div>

<style>
	.lyric-line {
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: 15px;
		line-height: 1.25;
		padding: 0 0 2px;
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
		/* padding compensated by the negative margin: the chord text starts exactly on the anchored character */
		padding: 0 0.35em;
		margin-left: -0.35em;
		cursor: grab;
		touch-action: none;
		user-select: none;
	}
	.chord-pill:active {
		cursor: grabbing;
	}
	.chord-popover {
		position: absolute;
		top: -0.3em;
		display: flex;
		flex-direction: column;
		gap: 4px;
		background: #fff;
		border: 1px solid #2f3e46;
		border-radius: 6px;
		padding: 3px;
		z-index: 5;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	}
	.popover-row {
		display: flex;
		gap: 2px;
	}
	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 3px;
		max-width: 16rem;
	}
	.suggestion {
		border: none;
		border-radius: 4px;
		background: #e8edf0;
		color: #2f3e46;
		font-family: inherit;
		font-size: 0.8em;
		font-weight: 700;
		padding: 1px 6px;
		cursor: pointer;
	}
	.suggestion:hover {
		background: #ffd166;
	}
	.chord-popover input {
		width: 7ch;
		font-family: inherit;
		font-size: 0.9em;
		border: 1px solid #ccc;
		border-radius: 4px;
		padding: 1px 4px;
	}
	.chord-popover input.invalid {
		border-color: #e5383b;
		background: #fbeae9;
	}
	.chord-popover button {
		border: none;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.8em;
		padding: 1px 6px;
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
		cursor: text;
		width: 1ch;
	}
	.char:hover {
		background: #ffd166;
	}
	.edit-text {
		visibility: hidden;
		border: none;
		background: none;
		cursor: pointer;
		color: #999;
		font-size: 1.3em;
		padding: 0 0.15em;
		line-height: 1;
	}
	.lyric-line:hover .edit-text {
		visibility: visible;
	}
	.text-edit {
		font: inherit;
		width: 100%;
		border: 1px solid #2f3e46;
		border-radius: 4px;
		padding: 1px 4px;
	}
</style>
