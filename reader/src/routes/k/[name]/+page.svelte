<script lang="ts">
	import { base } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.book.label} — Canzoniere</title>
</svelte:head>

<nav><a href="{base}/">← Canzonieri</a></nav>
<h1>🗓️ {data.book.label}</h1>

<ol class="songs">
	{#each data.book.songs as song, i (song.category + '/' + song.slug)}
		<li>
			<a href="{base}/s/{song.category}/{song.slug}/?from={data.book.name}">
				<span class="num">{i + 1}.</span>
				<span class="title">{song.title}</span>
				{#if song.artist}<span class="artist">{song.artist}</span>{/if}
			</a>
		</li>
	{/each}
</ol>

{#if data.book.missing.length > 0}
	<p class="missing">
		Voci non trovate: {data.book.missing.join(', ')}
	</p>
{/if}

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

	.songs {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.songs li {
		border-bottom: 1px solid #e5e7eb;
	}

	.songs a {
		display: flex;
		align-items: baseline;
		gap: 10px;
		padding: 12px 4px;
		text-decoration: none;
		color: inherit;
	}

	.num {
		color: #9ca3af;
		font-variant-numeric: tabular-nums;
	}

	.title {
		font-weight: 500;
		flex: 1;
	}

	.artist {
		font-size: 13px;
		color: #6b7280;
		text-align: right;
	}

	.missing {
		margin-top: 16px;
		font-size: 13px;
		color: #b91c1c;
	}
</style>
