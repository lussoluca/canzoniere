<script lang="ts">
	// Textarea with ChordPro syntax highlighting: a colored <pre> sits behind a
	// textarea whose text is transparent (only the caret is visible).
	let { value = $bindable() }: { value: string } = $props();

	let preEl: HTMLPreElement | undefined = $state();
	let taEl: HTMLTextAreaElement | undefined = $state();

	const META = new Set(['title', 't', 'artist', 'tag', 'columns']);
	const CHORUS = new Set(['start_of_chorus', 'end_of_chorus', 'soc', 'eoc', 'chorus']);
	const DIRECTIVE_RE = /^\{\s*([\w-]+)\s*(?::\s*(.*?)\s*)?\}\s*$/;

	function esc(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	const html = $derived(
		value
			.split('\n')
			.map((line) => {
				const m = line.match(DIRECTIVE_RE);
				if (m) {
					const name = m[1].toLowerCase();
					const cls = META.has(name)
						? 'hl-meta'
						: CHORUS.has(name)
							? 'hl-chorus'
							: name === 'comment' || name === 'c'
								? 'hl-comment'
								: 'hl-directive';
					return `<span class="${cls}">${esc(line)}</span>`;
				}
				return esc(line).replace(/\[([^\]]*)\]/g, '<span class="hl-chord">[$1]</span>');
			})
			.join('\n') + '\n'
	);

	function syncScroll() {
		if (preEl && taEl) {
			preEl.scrollTop = taEl.scrollTop;
			preEl.scrollLeft = taEl.scrollLeft;
		}
	}
</script>

<div class="cpe">
	<pre bind:this={preEl} aria-hidden="true">{@html html}</pre>
	<textarea bind:this={taEl} bind:value spellcheck="false" onscroll={syncScroll} data-testid="raw-editor"
	></textarea>
</div>

<style>
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
</style>
