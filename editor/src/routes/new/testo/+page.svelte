<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { parseLyricLine, serialize, type Line, type Song } from '$lib/chordpro';
	import { categoryLabel } from '$lib/categories';
	import { online } from '$lib/online';
	import { savePending } from '$lib/pending.svelte';
	import { slugify } from '$lib/slug';
	import TagInput from '$lib/components/TagInput.svelte';

	let { data } = $props();

	let title = $state('');
	let artist = $state('');
	let labels = $state<string[]>([]);
	let columns = $state<number | null>(null);
	let scroll = $state<number | null>(null);
	let text = $state('');
	let saving = $state(false);
	let status = $state('');

	// The starting category comes from ?category=, read client-side because the
	// page is prerendered without query params.
	let category = $state<string | null>(null);
	onMount(() => {
		const requested = new URLSearchParams(location.search).get('category');
		category = requested && data.categories.includes(requested) ? requested : data.categories[0];
	});

	const fullEditorHref = $derived(
		`${base}/new${category ? `?category=${encodeURIComponent(category)}` : ''}`
	);

	// Each pasted line becomes a lyric line, blank lines separate the stanzas.
	// [Accordi] in square brackets survive for who already writes them.
	function toLines(source: string): Line[] {
		return source
			.replace(/\r\n?/g, '\n')
			.replace(/\n+$/, '')
			.split('\n')
			.map((row): Line => {
				if (row.trim() === '') return { type: 'empty' };
				const { text: lyric, chords } = parseLyricLine(row);
				return { type: 'lyric', text: lyric, chords };
			});
	}

	async function save() {
		if (!category) return;
		if (!title.trim()) {
			status = 'Il titolo è obbligatorio';
			return;
		}
		if (!text.trim()) {
			status = 'Il testo è obbligatorio';
			return;
		}
		const song: Song = {
			meta: {
				title: title.trim(),
				artist: artist.trim(),
				tags: [categoryLabel(category)],
				labels,
				columns,
				scroll
			},
			lines: toLines(text)
		};
		const content = serialize(song);
		const file = slugify(song.meta.title) + '.cho';
		saving = true;
		status = '';
		try {
			if (online) {
				// Online mode: the song goes into the local queue and reopens in the
				// full editor from /new?pending=, like any song created on this device.
				const path = `canzoni/${category}/${file}`;
				savePending(path, song.meta.title, content, true);
				await goto(`${base}/new?pending=${encodeURIComponent(path)}`);
				return;
			}
			const res = await fetch(`${base}/api/songs`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ category, file, content })
			});
			if (!res.ok) throw new Error(await res.text());
			await goto(`${base}/edit/${encodeURIComponent(category)}/${encodeURIComponent(file)}`);
		} catch (e) {
			status = `Errore: ${e instanceof Error ? e.message : e}`;
		} finally {
			saving = false;
		}
	}
</script>

<h2>Aggiungi un testo</h2>

<p class="intro">
	Scrivi il titolo e incolla il testo così com'è: gli accordi non servono, chi li conosce potrà
	aggiungerli dopo. Se sai già usare ChordPro puoi aprire direttamente
	<a href={fullEditorHref} data-testid="full-editor">l'editor completo</a>.
</p>

{#if category}
	<div class="form" data-testid="simple-form">
		<p class="legend"><span class="req">*</span> campo obbligatorio</p>
		<label>
			<span class="lbl">Titolo <span class="req">*</span></span>
			<input bind:value={title} data-testid="simple-title" />
		</label>
		<label>
			<span class="lbl">Artista</span>
			<input bind:value={artist} data-testid="simple-artist" />
		</label>
		<label>
			<span class="lbl">Categoria</span>
			<select bind:value={category} data-testid="simple-category">
				{#each data.categories as c (c)}
					<option value={c}>{categoryLabel(c)}</option>
				{/each}
			</select>
		</label>
		<label
			class="tags-field"
			title="Tag liberi per la ricerca nel reader (es. #omelia). Suggerisce quelli già usati."
		>
			<span class="lbl">Tag</span>
			<TagInput bind:tags={labels} suggestions={data.allTags} />
		</label>
		<label>
			<span class="lbl">Colonne</span>
			<input
				type="number"
				min="1"
				max="4"
				value={columns ?? ''}
				oninput={(e) => {
					const v = parseInt(e.currentTarget.value, 10);
					columns = Number.isNaN(v) ? null : v;
				}}
				data-testid="simple-columns"
			/>
		</label>
		<label title="Velocità iniziale dello scorrimento automatico nel reader (1–10). Vuoto = predefinito.">
			<span class="lbl">Scorrimento</span>
			<input
				type="number"
				min="1"
				max="10"
				placeholder="auto"
				value={scroll ?? ''}
				oninput={(e) => {
					const v = parseInt(e.currentTarget.value, 10);
					scroll = Number.isNaN(v) ? null : Math.min(10, Math.max(1, v));
				}}
				data-testid="simple-scroll"
			/>
		</label>
		<label class="text-field">
			<span class="lbl">Testo <span class="req">*</span></span>
			<textarea
				bind:value={text}
				rows="14"
				placeholder={'Alla mattina ci alziamo presto\ne cantiamo questa canzone\n\nIl ritornello arriva adesso\ncon la sua melodia'}
				data-testid="simple-text"
			></textarea>
		</label>
		<div class="actions">
			<button class="btn primary" onclick={save} disabled={saving} data-testid="simple-save">
				Salva e apri l'editor
			</button>
			{#if status}
				<span class="status" data-testid="simple-status">{status}</span>
			{/if}
		</div>
	</div>
{/if}

<style>
	.intro {
		color: #555;
		max-width: 60ch;
	}
	.form {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.8rem 1rem;
		background: #fff;
		border-radius: 10px;
		padding: 1.1rem 1.2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: #555;
	}
	.legend {
		grid-column: 1 / -1;
		margin: 0;
		color: #999;
		font-size: 0.8rem;
	}
	.req {
		color: #b3261e;
	}
	input,
	select,
	textarea {
		padding: 0.4rem 0.6rem;
		border: 1px solid #ccc;
		border-radius: 6px;
		font-size: 0.95rem;
		font-weight: 400;
	}
	.text-field {
		grid-column: 1 / -1;
	}
	textarea {
		font-family: inherit;
		resize: vertical;
	}
	.actions {
		grid-column: 1 / -1;
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.status {
		color: #b3261e;
		font-size: 0.9rem;
	}
</style>
