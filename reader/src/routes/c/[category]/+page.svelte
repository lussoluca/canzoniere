<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{data.category.label} — Canzoniere Alessandria 2</title></svelte:head>
<nav><a href="{resolve('/')}">← Categorie</a></nav>
<h1>{data.category.label}</h1>

<ul class="songs">
	{#each data.songs as song (song.slug)}
		<li>
			<a
				href={resolve(`s/${song.category}/${song.slug}/`)}
			>
				<span class="title">{song.title}</span>
				{#if song.artist}<span class="artist">{song.artist}</span>{/if}
			</a>
		</li>
	{/each}
</ul>

<style>
	nav {
		margin-bottom: var(--space-3);
	}

	nav a {
		text-decoration: none;
		font-size: var(--text-lg);
	}

	h1 {
		font-size: var(--text-4xl);
		margin: 0 0 var(--space-5);
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
		gap: var(--space-5);
		padding: var(--space-5) var(--space-1);
		text-decoration: none;
		color: inherit;
	}

	.songs .title {
		font-weight: 500;
	}

	.songs .artist {
		font-size: var(--text-sm);
		color: var(--muted);
		text-align: right;
	}
</style>
