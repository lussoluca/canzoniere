<script lang="ts">
	import { normalizeTag } from '$lib/tags';

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
		gap: 0.25rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		background: #fff;
		padding: 0.2rem 0.3rem;
		min-height: 1.9rem;
		box-sizing: border-box;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: #eef3f5;
		color: #2f3e46;
		border-radius: 999px;
		padding: 0.1rem 0.3rem 0.1rem 0.55rem;
		font-size: 0.85rem;
		font-weight: 500;
		white-space: nowrap;
	}
	.chip button {
		border: none;
		background: none;
		cursor: pointer;
		color: #6b7f88;
		font-size: 0.75rem;
		line-height: 1;
		padding: 0.15rem;
	}
	.chip button:hover {
		color: #2f3e46;
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
		font-size: 0.95rem;
		padding: 0.2rem;
		background: transparent;
		box-sizing: border-box;
	}
	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 4px;
		z-index: 20;
		display: flex;
		flex-direction: column;
		min-width: 10rem;
		max-height: 14rem;
		overflow-y: auto;
		padding: 0.2rem;
		background: #fff;
		border: 1px solid #ddd;
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}
	.suggestions button {
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
	.suggestions button:hover {
		background: #f0f0f0;
	}
</style>
