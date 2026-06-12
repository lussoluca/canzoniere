<script lang="ts">
	import { categoryLabel } from '$lib/categories';

	let { data } = $props();
</script>

<div class="head">
	<h2>Categorie</h2>
	<a href="/new" class="btn primary" data-testid="new-song">+ Nuova canzone</a>
</div>

<div class="folders">
	{#each data.categories as c (c.category)}
		<a href={`/c/${encodeURIComponent(c.category)}`} class="folder" data-testid="folder">
			<span class="icon">📁</span>
			<span class="name">{categoryLabel(c.category)}</span>
			<span class="count">{c.count} canzoni</span>
		</a>
	{/each}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	h2 {
		margin: 0.4rem 0 1rem;
	}
	.folders {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 0.8rem;
	}
	.folder {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		background: #fff;
		border-radius: 10px;
		padding: 1.1rem 1.2rem;
		text-decoration: none;
		color: inherit;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		transition: box-shadow 0.15s;
	}
	.folder:hover {
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
	}
	.icon {
		font-size: 1.6rem;
	}
	.name {
		font-weight: 700;
		font-size: 1.05rem;
	}
	.count {
		color: #888;
		font-size: 0.85rem;
	}
</style>
