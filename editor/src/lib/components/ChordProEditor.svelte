<script lang="ts">
	// Textarea with ChordPro syntax highlighting: a colored <pre> sits behind a
	// textarea whose text is transparent (only the caret is visible). Typing `{`
	// at the start of a line opens the list of the directives; the directives
	// written wrong are marked in the text and listed below it.
	import { tick } from 'svelte';
	import { analyze, completions, type DirectiveSpec, type LineInfo } from '#lib/directives.js';

	let { value = $bindable() }: { value: string } = $props();

	let boxEl: HTMLDivElement | undefined = $state();
	let preEl: HTMLPreElement | undefined = $state();
	let taEl: HTMLTextAreaElement | undefined = $state();
	let menuEl: HTMLUListElement | undefined = $state();

	const analysis = $derived(analyze(value));

	function esc(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	function span(cls: string, text: string): string {
		return `<span class="${cls}">${esc(text)}</span>`;
	}

	function directiveHtml(info: Extract<LineInfo, { kind: 'directive' }>): string {
		const kind = info.spec && info.spec.kind !== 'other' ? info.spec.kind : 'directive';
		const mark = info.problem?.severity === 'warning' ? ' hl-warning' : ' hl-error';
		const name = span('hl-name' + (info.bad === 'name' ? mark : ''), info.name);
		const val = info.value ? span('hl-value' + (info.bad === 'value' ? mark : ''), info.value) : '';
		const cls = `hl-${kind}` + (info.bad === 'line' ? mark : '');
		return `<span class="${cls}">${esc(info.open)}${name}${esc(info.sep)}${val}${esc(info.close)}</span>`;
	}

	const html = $derived(
		value
			.split('\n')
			.map((line, i) => {
				const info = analysis.lines[i];
				switch (info?.kind) {
					case 'directive':
						return directiveHtml(info);
					case 'malformed':
						return span('hl-error', line);
					case 'tab':
						return esc(line);
					default:
						return esc(line).replace(/\[([^\]]*)\]/g, '<span class="hl-chord">[$1]</span>');
				}
			})
			.join('\n') + '\n'
	);

	function syncScroll() {
		if (preEl && taEl) {
			preEl.scrollTop = taEl.scrollTop;
			preEl.scrollLeft = taEl.scrollLeft;
		}
	}

	// the box of one character as the <pre> lays it out, which is exactly how
	// the textarea above it lays out the same text
	function charRect(index: number): DOMRect | null {
		if (!preEl || index < 0) return null;
		const walker = document.createTreeWalker(preEl, NodeFilter.SHOW_TEXT);
		let offset = index;
		for (let node = walker.nextNode(); node; node = walker.nextNode()) {
			const len = node.textContent?.length ?? 0;
			if (offset < len) {
				const range = document.createRange();
				range.setStart(node, offset);
				range.setEnd(node, offset + 1);
				return range.getBoundingClientRect();
			}
			offset -= len;
		}
		return null;
	}

	// --- directive autocomplete ---
	interface Menu {
		from: number; // where the directive name starts, right after `{`
		items: DirectiveSpec[];
		active: number;
		x: number;
		y: number;
		above: boolean; // y is then the distance from the bottom of the box
	}
	let menu: Menu | null = $state(null);
	const MENU_ROOM = 250; // px the list needs below the caret, otherwise it opens above

	async function updateMenu() {
		await tick(); // the <pre> holds the text just typed
		if (!taEl || !boxEl || taEl.selectionStart !== taEl.selectionEnd) {
			menu = null;
			return;
		}
		const caret = taEl.selectionStart;
		const text = taEl.value;
		const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
		const typed = text.slice(lineStart, caret).match(/^\{\s*([\w-]*)$/);
		const items = typed ? completions(typed[1]) : [];
		const rect = charRect(caret - 1);
		if (!typed || items.length === 0 || !rect) {
			menu = null;
			return;
		}
		const box = boxEl.getBoundingClientRect();
		const above = box.bottom - rect.bottom < MENU_ROOM && rect.top - box.top > MENU_ROOM;
		const kept = menu ? items.findIndex((s) => s.name === menu!.items[menu!.active]?.name) : -1;
		menu = {
			from: caret - typed[1].length,
			items,
			active: Math.max(0, kept),
			x: rect.right - box.left,
			y: above ? box.bottom - rect.top : rect.bottom - box.top,
			above
		};
	}

	// writes the chosen directive over the name typed so far; a directive still
	// to be closed gets its `}` and, when it takes a value, the caret on it
	function accept(spec: DirectiveSpec) {
		if (!taEl || !menu) return;
		const text = taEl.value;
		const from = menu.from;
		let end = taEl.selectionStart;
		while (end < text.length && /[\w-]/.test(text[end])) end++;
		let insert = spec.name;
		let selection = [from + insert.length, from + insert.length];
		if (text[end] !== ':' && text[end] !== '}') {
			if (spec.value === 'none' || spec.value === 'optional') {
				insert += '}';
				selection = [from + insert.length, from + insert.length];
			} else {
				const placeholder = spec.placeholder ?? '';
				insert += ':' + placeholder + '}';
				const valueStart = from + spec.name.length + 1;
				selection = [valueStart, valueStart + placeholder.length];
			}
		}
		taEl.setRangeText(insert, from, end, 'end');
		menu = null;
		taEl.dispatchEvent(new Event('input', { bubbles: true }));
		taEl.setSelectionRange(selection[0], selection[1]);
	}

	function onkeydown(e: KeyboardEvent) {
		if (!menu || e.isComposing) return;
		const n = menu.items.length;
		if (e.key === 'ArrowDown') menu.active = (menu.active + 1) % n;
		else if (e.key === 'ArrowUp') menu.active = (menu.active - 1 + n) % n;
		else if (e.key === 'Enter' || e.key === 'Tab') accept(menu.items[menu.active]);
		else if (e.key === 'Escape') menu = null;
		else return;
		e.preventDefault();
	}

	// moving the caret only refreshes (or closes) a list already open
	function onkeyup(e: KeyboardEvent) {
		if (menu && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) updateMenu();
	}

	// keeps the highlighted option inside the visible part of the list
	$effect(() => {
		const i = menu?.active;
		const el = i === undefined ? undefined : (menuEl?.children[i] as HTMLElement | undefined);
		if (!menuEl || !el) return;
		if (el.offsetTop < menuEl.scrollTop) menuEl.scrollTop = el.offsetTop;
		else if (el.offsetTop + el.offsetHeight > menuEl.scrollTop + menuEl.clientHeight)
			menuEl.scrollTop = el.offsetTop + el.offsetHeight - menuEl.clientHeight;
	});

	// --- problems: a click puts the caret on the line and scrolls to it ---
	function goToLine(line: number) {
		if (!taEl || !preEl) return;
		const start = value
			.split('\n')
			.slice(0, line)
			.reduce((n, l) => n + l.length + 1, 0);
		taEl.focus({ preventScroll: true });
		taEl.setSelectionRange(start, start);
		syncScroll();
		const rect = charRect(start);
		if (rect) {
			taEl.scrollTop += rect.top - preEl.getBoundingClientRect().top - taEl.clientHeight / 3;
			syncScroll();
		}
	}
</script>

<div class="cpe-wrap">
	<div class="cpe" bind:this={boxEl}>
		<pre bind:this={preEl} aria-hidden="true" data-testid="raw-highlight">{@html html}</pre>
		<textarea
			bind:this={taEl}
			bind:value
			spellcheck="false"
			aria-autocomplete="list"
			aria-controls={menu ? 'directive-menu' : undefined}
			aria-activedescendant={menu ? `directive-option-${menu.active}` : undefined}
			oninput={updateMenu}
			{onkeydown}
			{onkeyup}
			onclick={() => menu && updateMenu()}
			onblur={() => (menu = null)}
			onscroll={() => {
				syncScroll();
				menu = null;
			}}
			data-testid="raw-editor"
		></textarea>
		{#if menu}
			<ul
				id="directive-menu"
				class="ac"
				role="listbox"
				aria-label="Direttive"
				bind:this={menuEl}
				style={`left: clamp(0px, ${menu.x}px, calc(100% - min(24rem, 100%))); ${menu.above ? 'bottom' : 'top'}: ${menu.y + 2}px`}
				data-testid="directive-menu"
			>
				{#each menu.items as spec, i (spec.name)}
					<li
						id={`directive-option-${i}`}
						role="option"
						tabindex="-1"
						aria-selected={i === menu.active}
						class:active={i === menu.active}
						onmousedown={(e) => {
							// keeps the focus in the textarea
							e.preventDefault();
							accept(spec);
						}}
						onmouseenter={() => menu && (menu.active = i)}
						data-testid="directive-option"
						data-name={spec.name}
					>
						<code class={spec.kind}>{spec.name}</code>
						<span>{spec.description}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if analysis.problems.length > 0}
		<ul class="problems" data-testid="raw-problems">
			{#each analysis.problems as p (p.line)}
				<li class={p.severity} data-testid="raw-problem">
					<button type="button" onclick={() => goToLine(p.line)}>Riga {p.line + 1}</button>
					{p.message}
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.cpe-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.cpe {
		position: relative;
		min-height: 60vh;
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
		background: var(--surface);
		overflow: hidden;
	}
	pre,
	textarea {
		position: absolute;
		inset: 0;
		margin: 0;
		padding: var(--space-5);
		border: none;
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: var(--text-md);
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
		overflow: auto;
	}
	pre {
		overflow: hidden;
		color: var(--text);
		pointer-events: none;
	}
	textarea {
		background: transparent;
		color: transparent;
		caret-color: var(--text);
		resize: none;
		outline: none;
	}
	/* highlight classes are injected via {@html}, so they need :global */
	.cpe :global(.hl-meta) {
		color: var(--directive);
		font-weight: 600;
	}
	.cpe :global(.hl-custom) {
		color: var(--directive-x);
		font-weight: 600;
	}
	.cpe :global(.hl-meta .hl-value),
	.cpe :global(.hl-custom .hl-value) {
		color: var(--text);
		font-weight: 400;
	}
	.cpe :global(.hl-chorus) {
		color: var(--success);
		font-weight: 600;
	}
	.cpe :global(.hl-comment) {
		color: var(--faint);
		font-style: italic;
	}
	.cpe :global(.hl-directive) {
		color: var(--faint);
	}
	.cpe :global(.hl-chord) {
		color: var(--chord);
		font-weight: 700;
	}
	.cpe :global(.hl-error) {
		background: var(--danger-bg);
		text-decoration: underline wavy var(--danger);
		text-decoration-skip-ink: none;
	}
	.cpe :global(.hl-warning) {
		text-decoration: underline wavy var(--warning);
		text-decoration-skip-ink: none;
	}

	.ac {
		position: absolute;
		z-index: 5;
		width: min(24rem, 100%);
		max-height: 15rem;
		overflow-y: auto;
		margin: 0;
		padding: var(--space-1);
		list-style: none;
		background: var(--surface);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 14px var(--shadow);
	}
	.ac li {
		display: flex;
		align-items: baseline;
		gap: var(--space-4);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--text-sm);
		color: var(--muted);
	}
	.ac li.active {
		background: var(--accent-bg);
	}
	.ac code {
		flex-shrink: 0;
		font-family: 'SF Mono', SFMono-Regular, Menlo, Consolas, monospace;
		font-size: var(--text-md);
		font-weight: 600;
		color: var(--text);
	}
	.ac code.custom {
		color: var(--directive-x);
	}
	.ac code.meta {
		color: var(--directive);
	}

	.problems {
		list-style: none;
		margin: 0;
		padding: var(--space-3) var(--space-5);
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		background: var(--surface);
		border: 1px solid var(--danger-border);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		color: var(--text);
	}
	.problems button {
		border: none;
		background: none;
		padding: 0;
		margin-right: var(--space-2);
		font: inherit;
		font-weight: 600;
		color: var(--danger);
		text-decoration: underline;
		cursor: pointer;
	}
	.problems .warning button {
		color: var(--warning);
	}
</style>
