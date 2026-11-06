<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { parse, serialize } from '@canzoniere/shared/chordpro';
	import { decodePauses, linesFingerprint, withPauses } from '@canzoniere/shared/pauses';
	import { categoryLabel } from '@canzoniere/shared/categories';
	import { online } from '#lib/online.js';
	import { getPending } from '#lib/pending.svelte.js';
	import SongEditor from '#lib/components/SongEditor.svelte';

	let { data } = $props();

	// Online mode: a song already edited on this device reopens in its queued
	// version, not the bundled one. Resolved client-side (localStorage), so the
	// editor renders only once the content for the current path is decided.
	const path = $derived(`canzoni/${data.category}/${data.file}`);
	let content = $state<string | null>(null);
	let resolvedFor = $state<string | null>(null);
	// Pauses proposed from the reader (?pauses=…&fp=…): applied to the version
	// about to be edited only if its lines are the ones the reader learned on;
	// nothing is queued until the user saves.
	let pauseImport = $state<'applied' | 'stale' | null>(null);
	$effect(() => {
		let next = (online ? getPending(path)?.content : undefined) ?? data.content;
		const params = page.url.searchParams;
		const proposed = params.get('pauses');
		pauseImport = null;
		if (proposed !== null) {
			const song = parse(next);
			if (params.get('fp') === linesFingerprint(song)) {
				next = serialize(withPauses(song, decodePauses(proposed)));
				pauseImport = 'applied';
			} else {
				pauseImport = 'stale';
			}
		}
		content = next;
		resolvedFor = path;
	});

	const title = $derived(parse(content ?? data.content).meta.title || data.file);
</script>

<nav class="crumbs">
	<a href="{resolve('/')}">Categorie</a>
	/ 

	<a
		href={resolve(`c/${encodeURIComponent(data.category)}`)}
	>{categoryLabel(data.category)}</a>

	/ {title}
</nav>

{#if pauseImport === 'applied'}
	<p class="notice" data-testid="pause-import">
		Tempi proposti dal reader: controlla le pause e salva.
	</p>
{:else if pauseImport === 'stale'}
	<p class="notice error" data-testid="pause-import-error">
		La canzone è cambiata da quando i tempi sono stati imparati: imparali di nuovo sul reader
		aggiornato.
	</p>
{/if}

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
	.notice {
		padding: 0.5rem 0.8rem;
		border-radius: 6px;
		background: #eef3f5;
		color: #2f3e46;
	}
	.notice.error {
		background: #fdecea;
		color: #8a1c1c;
	}
	.crumbs {
		font-size: 0.9rem;
		color: #777;
		margin-bottom: 0.8rem;
	}
	.crumbs a {
		color: #2f3e46;
	}
</style>
