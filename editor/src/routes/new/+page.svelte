<script lang="ts">
	import { onMount } from 'svelte';
	import type { Song } from '$lib/chordpro';
	import SongEditor from '$lib/components/SongEditor.svelte';

	let { data } = $props();

	const empty: Song = {
		meta: { title: '', artist: '', tags: [], labels: [], columns: null, scroll: null },
		lines: []
	};

	// The starting category comes from ?category=, read client-side because the
	// page is prerendered without query params.
	let category = $state<string | null>(null);

	onMount(() => {
		const requested = new URLSearchParams(location.search).get('category');
		category = requested && data.categories.includes(requested) ? requested : data.categories[0];
	});
</script>

<h2>Nuova canzone</h2>

{#if category}
	<SongEditor
		initial={empty}
		categories={data.categories}
		allTags={data.allTags}
		mode="new"
		{category}
	/>
{/if}
