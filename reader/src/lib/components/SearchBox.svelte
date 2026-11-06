<script lang="ts">
	import { normalizeTag } from '@canzoniere/shared/tags';
	import { allTags } from '#lib/data.js';
	import { parseQuery } from '#lib/search.js';

	interface Props {
		value: string;
		placeholder?: string;
	}

	let { value = $bindable(), placeholder = 'Cerca un canto…' }: Props = $props();

	let focused = $state(false);

	// the token being typed (the last one); a leading # opens the suggestions
	let activeToken = $derived.by(() => {
		const tokens = value.split(/\s+/);
		return tokens[tokens.length - 1] ?? '';
	});

	let suggestions = $derived.by(() => {
		if (!activeToken.startsWith('#')) return [];
		const prefix = normalizeTag(activeToken);
		const used = new Set(parseQuery(value.slice(0, value.length - activeToken.length)).tags);
		return allTags.filter((t) => !used.has(t) && (prefix === '' || t.startsWith(prefix)));
	});

	let open = $derived(focused && suggestions.length > 0);

	// replace the token being typed with the chosen tag, ready for more input
	function pick(tag: string) {
		value = value.slice(0, value.length - activeToken.length) + '#' + tag + ' ';
	}
</script>

<div class="search-box">
	<input
		class="search"
		type="search"
		{placeholder}
		bind:value
		onfocus={() => (focused = true)}
		onblur={() => (focused = false)}
		autocomplete="off"
		autocorrect="off"
		autocapitalize="off"
	/>
	{#if open}
		<div class="suggestions" data-testid="tag-suggestions">
			{#each suggestions as tag (tag)}
				<button
					type="button"
					onmousedown={(e) => {
						e.preventDefault();
						pick(tag);
					}}
				>
					#{tag}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.search-box {
		position: relative;
	}

	.search {
		width: 100%;
		box-sizing: border-box;
		font-size: var(--text-2xl);
		padding: var(--space-5) var(--space-6);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		color: inherit;
	}

	.suggestions {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		margin-top: var(--space-1);
		z-index: 30;
		max-height: 40vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		box-shadow: 0 4px 14px var(--shadow);
		padding: var(--space-1);
	}

	.suggestions button {
		border: none;
		background: none;
		color: inherit;
		font-size: var(--text-xl);
		text-align: left;
		padding: var(--space-4) var(--space-5);
		border-radius: var(--radius-md);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.suggestions button:hover {
		background: var(--surface-alt);
	}
</style>
