<script lang="ts">
	import type { Song } from '$lib/chordpro';
	import SongEditor from '$lib/components/SongEditor.svelte';

	let { data } = $props();

	const empty: Song = {
		meta: { title: '', artist: '', tags: [], columns: null, scroll: null },
		lines: []
	};
</script>

<h2>Nuova canzone</h2>

<SongEditor initial={empty} categories={data.categories} mode="new" category={data.category} />
