<script lang="ts">
	import { normalizeTag } from '@canzoniere/shared/tags';

	interface Props {
		tags: string[];
		suggestions: string[];
	}

	let { tags = $bindable(), suggestions }: Props = $props();

	let input = $state('');
	let focused = $state(false);

	// existing tags matching what's being typed, minus the ones already on the song
	let matching = $derived.by(() => {
		const q = normalizeTag(input);
		return suggestions.filter((t) => !tags.includes(t) && (q === '' || t.startsWith(q)));
	});

	let open = $derived(focused && matching.length > 0);

	function add(raw: string) {
		const tag = normalizeTag(raw);
		if (tag !== '' && !tags.includes(tag)) tags = [...tags, tag];
		input = '';
	}

	function remove(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ',') {
			e.preventDefault();
			if (input.trim() !== '') add(input);
		} else if (e.key === 'Backspace' && input === '' && tags.length > 0) {
			remove(tags[tags.length - 1]);
		} else if (e.key === 'Escape') {
			focused = false;
		}
	}
</script>

<div class="tag-input" data-testid="meta-tags">
	{#each tags as tag (tag)}
		<span class="chip" data-testid="tag-chip">
			#{tag}
			<button
				type="button"
				onclick={() => remove(tag)}
				title="Rimuovi tag"
				aria-label={`Rimuovi tag ${tag}`}
				data-testid="tag-remove"
			>
				✕
			</button>
		</span>
	{/each}
	<span class="entry">
		<input
			bind:value={input}
			onkeydown={onKeydown}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			placeholder={tags.length === 0 ? 'es. omelia, comunione…' : ''}
			data-testid="tag-entry"
		/>
		{#if open}
			<div class="suggestions" data-testid="tag-suggestions">
				{#each matching as tag (tag)}
					<button
						type="button"
						onmousedown={(e) => {
							e.preventDefault();
							add(tag);
						}}
						data-testid="tag-suggestion"
					>
						#{tag}
					</button>
				{/each}
			</div>
		{/if}
	</span>
</div>

<style>
	.tag-input {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-1);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		padding: var(--space-1) var(--space-2);
		min-height: 1.9rem;
		box-sizing: border-box;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		background: var(--accent-bg);
		color: var(--text);
		border-radius: var(--radius-pill);
		padding: 0.1rem var(--space-2) 0.1rem var(--space-4);
		font-size: var(--text-md);
		font-weight: 500;
		white-space: nowrap;
	}
	.chip button {
		border: none;
		background: none;
		cursor: pointer;
		color: var(--accent-text);
		font-size: var(--text-xs);
		line-height: 1;
		padding: 0.15rem;
	}
	.chip button:hover {
		color: var(--text);
	}
	.entry {
		position: relative;
		flex: 1;
		min-width: 8rem;
	}
	.entry input {
		width: 100%;
		border: none;
		outline: none;
		font-size: var(--text-lg);
		padding: var(--space-1);
		background: transparent;
		color: var(--text);
		box-sizing: border-box;
	}
	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: var(--space-1);
		z-index: 20;
		display: flex;
		flex-direction: column;
		min-width: 10rem;
		max-height: 14rem;
		overflow-y: auto;
		padding: var(--space-1);
		background: var(--surface);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-sm);
		box-shadow: 0 2px 8px var(--shadow);
	}
	.suggestions button {
		border: none;
		background: none;
		border-radius: var(--radius-xs);
		cursor: pointer;
		text-align: left;
		white-space: nowrap;
		padding: var(--space-2) var(--space-4);
		font-size: var(--text-md);
		color: var(--text);
	}
	.suggestions button:hover {
		background: var(--surface-alt);
	}
</style>
