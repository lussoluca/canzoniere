<script lang="ts">
	// Line icons of the editor's controls: drawn on a 24-unit grid with a
	// stroke in the text colour, sized by the surrounding font size.
	let { name }: { name: 'pencil' | 'plus' | 'minus' | 'pause' | 'trash' | 'comment' } = $props();
</script>

<svg
	width="1em"
	height="1em"
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'pencil'}
		<path d="M4 20h4L19 9l-4-4L4 16v4z" />
		<path d="M13.5 6.5l4 4" />
	{:else if name === 'plus'}
		<path d="M12 5v14M5 12h14" />
	{:else if name === 'minus'}
		<path d="M5 12h14" />
	{:else if name === 'pause'}
		<path d="M9 5v14M15 5v14" />
	{:else if name === 'trash'}
		<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
	{:else if name === 'comment'}
		<path d="M5 5h14v10H9l-4 4V5z" />
	{/if}
</svg>

<style>
	svg {
		flex-shrink: 0;
		display: block;
	}
</style>
