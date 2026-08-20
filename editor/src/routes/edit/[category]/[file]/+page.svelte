<script lang="ts">
	import { base } from '$app/paths';
	import { parse } from '$lib/chordpro';
	import { categoryLabel } from '$lib/categories';
	import { online } from '$lib/online';
	import { getPending } from '$lib/pending.svelte';
	import SongEditor from '$lib/components/SongEditor.svelte';

	let { data } = $props();

	// Online mode: a song already edited on this device reopens in its queued
	// version, not the bundled one. Resolved client-side (localStorage), so the
	// editor renders only once the content for the current path is decided.
	const path = $derived(`canzoni/${data.category}/${data.file}`);
	let content = $state<string | null>(null);
	let resolvedFor = $state<string | null>(null);
	$effect(() => {
		content = (online ? getPending(path)?.content : undefined) ?? data.content;
		resolvedFor = path;
	});

	const title = $derived(parse(content ?? data.content).meta.title || data.file);
</script>

<nav class="crumbs">
	<a href="{base}/">Categorie</a> /
	<a href={`${base}/c/${encodeURIComponent(data.category)}`}>{categoryLabel(data.category)}</a> /
	{title}
</nav>

{#if content !== null && resolvedFor === path}
	{#key data.category + '/' + data.file}
		<SongEditor
			initial={parse(content)}
			categories={data.categories}
			allTags={data.allTags}
			mode="edit"
			category={data.category}
			file={data.file}
		/>
	{/key}
{/if}

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
