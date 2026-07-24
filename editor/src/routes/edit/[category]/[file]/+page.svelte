<script lang="ts">
	import { parse } from '$lib/chordpro';
	import { categoryLabel } from '$lib/categories';
	import SongEditor from '$lib/components/SongEditor.svelte';

	let { data } = $props();

	const title = $derived(parse(data.content).meta.title || data.file);
</script>

<nav class="crumbs">
	<a href="/">Categorie</a> /
	<a href={`/c/${encodeURIComponent(data.category)}`}>{categoryLabel(data.category)}</a> /
	{title}
</nav>

{#key data.category + '/' + data.file}
	<SongEditor
		initial={parse(data.content)}
		categories={data.categories}
		allTags={data.allTags}
		mode="edit"
		category={data.category}
		file={data.file}
	/>
{/key}

<style>
	.crumbs {
		font-size: 0.9rem;
		color: #777;
		margin-bottom: 0.8rem;
	}
	.crumbs a {
		color: #2f3e46;
	}
</style>
