<script lang="ts">
	import { parse } from '$lib/chordpro';
	import SongEditor from '$lib/components/SongEditor.svelte';

	let { data } = $props();
</script>

{#key data.category + '/' + data.file}
	<SongEditor
		initial={parse(data.content)}
		categories={data.categories}
		mode="edit"
		category={data.category}
		file={data.file}
	/>
{/key}
