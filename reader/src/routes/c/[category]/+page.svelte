<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function randomSong() {
		const song = data.songs[Math.floor(Math.random() * data.songs.length)];
		goto(`${base}/s/${song.category}/${song.slug}/`);
	}
</script>

<svelte:head>
	<title>{data.category.label} — Canzoniere</title>
</svelte:head>

<nav><a href="{base}/">← Categorie</a></nav>
<h1>{data.category.label}</h1>

{#if data.songs.length > 0}
	<button class="random" onclick={randomSong}>🎲 Canto a caso</button>
{/if}

<ul class="songs">
	{#each data.songs as song (song.slug)}
		<li>
			<a href="{base}/s/{song.category}/{song.slug}/">
				<span class="title">{song.title}</span>
				{#if song.artist}<span class="artist">{song.artist}</span>{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	nav {
		margin-bottom: 8px;
	}

	nav a {
		text-decoration: none;
		font-size: 15px;
	}

	h1 {
		font-size: 24px;
		margin: 0 0 12px;
	}

	.random {
		font: inherit;
		font-size: 15px;
		margin-bottom: 12px;
		padding: 10px 16px;
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.songs {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid var(--border);
	}

	.songs a {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 12px;
		padding: 12px 4px;
		text-decoration: none;
		color: inherit;
	}

	.songs .title {
		font-weight: 500;
	}

	.songs .artist {
		font-size: 13px;
		color: var(--muted);
		text-align: right;
	}
</style>
