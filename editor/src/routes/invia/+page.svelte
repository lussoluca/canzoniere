<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { online, API_BASE } from '$lib/online';
	import { pendingSongs, removePending, clearPending } from '$lib/pending.svelte';

	let key = $state('');
	let note = $state('');
	let author = $state('');
	let sending = $state(false);
	let prUrl = $state('');
	let error = $state('');

	onMount(() => {
		key = localStorage.getItem('editor:key') ?? '';
		author = localStorage.getItem('editor:author') ?? '';
	});

	async function send() {
		if (sending || pendingSongs().length === 0 || !key.trim()) return;
		sending = true;
		error = '';
		try {
			let res: Response;
			try {
				res = await fetch(`${API_BASE}/api/songs/batch`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'X-Editor-Key': key.trim() },
					body: JSON.stringify({
						files: pendingSongs().map((s) => ({ path: s.path, content: s.content })),
						note: note.trim(),
						author: author.trim()
					})
				});
			} catch {
				throw new Error('Impossibile raggiungere il servizio: controlla la connessione e riprova.');
			}
			if (res.status === 401) {
				throw new Error('Password errata.');
			}
			if (res.status === 429) {
				throw new Error('Troppi invii ravvicinati: aspetta un minuto e riprova.');
			}
			if (!res.ok) {
				let detail = '';
				try {
					detail = ((await res.json()) as { error?: string }).error ?? '';
				} catch {
					// non-JSON error body: keep the generic message
				}
				throw new Error(detail || `Invio non riuscito (HTTP ${res.status}).`);
			}
			prUrl = ((await res.json()) as { pullRequestUrl: string }).pullRequestUrl;
			localStorage.setItem('editor:key', key.trim());
			localStorage.setItem('editor:author', author.trim());
			clearPending();
			note = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invio non riuscito, riprova.';
		} finally {
			sending = false;
		}
	}

	function discard(path: string, title: string) {
		if (confirm(`Scartare le modifiche a "${title}"?`)) removePending(path);
	}

	function formatWhen(ts: number): string {
		return new Date(ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' });
	}
</script>

<svelte:head>
	<title>Invia modifiche — Canzoniere Alessandria 2</title>
</svelte:head>

<h2>Invia modifiche</h2>

{#if !online}
	<div class="card">
		<p>
			Questa pagina serve nell'editor online. In locale le modifiche si salvano direttamente nel
			repository.
		</p>
	</div>
{:else if prUrl}
	<div class="card">
		<p class="done">✅ Modifiche inviate!</p>
		<p>
			È stata aperta una richiesta di integrazione: verrà rivista e pubblicata.
			<a href={prUrl} target="_blank" rel="noopener">Seguila qui</a>.
		</p>
		<a class="btn" href="{base}/">Torna alle canzoni</a>
	</div>
{:else if pendingSongs().length === 0}
	<div class="card">
		<p>Nessuna modifica in attesa. Apri una canzone, modificala e salvala: la ritrovi qui.</p>
		<a class="btn" href="{base}/">Vai alle canzoni</a>
	</div>
{:else}
	<div class="card">
		<table data-testid="pending-table">
			<thead>
				<tr>
					<th>Canzone</th>
					<th>File</th>
					<th>Salvata</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each pendingSongs() as s (s.path)}
					<tr>
						<td>{s.title}</td>
						<td><code>{s.path}</code></td>
						<td>{formatWhen(s.savedAt)}</td>
						<td>
							<button class="btn danger" onclick={() => discard(s.path, s.title)}>Scarta</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="card form">
		<label>
			Il tuo nome (facoltativo)
			<input type="text" bind:value={author} placeholder="Come ti chiami" maxlength="80" />
		</label>
		<label>
			Nota per chi revisiona (facoltativa)
			<input type="text" bind:value={note} placeholder="Cosa hai cambiato e perché" maxlength="300" />
		</label>
		<label>
			Password dell'editor
			<input type="password" bind:value={key} autocomplete="current-password" />
		</label>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button
			class="btn primary"
			onclick={send}
			disabled={sending || !key.trim()}
			data-testid="send-pending"
		>
			{sending
				? 'Invio in corso…'
				: `Invia ${pendingSongs().length} ${pendingSongs().length === 1 ? 'modifica' : 'modifiche'}`}
		</button>
	</div>
{/if}

<style>
	h2 {
		margin: 0.4rem 0 1rem;
	}
	.card {
		background: #fff;
		border-radius: 8px;
		padding: 1rem 1.2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		margin-bottom: 0.8rem;
	}
	.card.form {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		max-width: 480px;
		margin-inline: auto;
	}
	.card.form label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.78rem;
		color: #777;
	}
	.card.form input {
		font-size: 0.95rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid #ccc;
		border-radius: 6px;
	}
	.done {
		font-weight: 600;
		margin: 0 0 0.4rem;
	}
	.error {
		margin: 0;
		color: #b3261e;
		font-size: 0.9rem;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		text-align: left;
		padding: 0.45rem 0.6rem;
		border-bottom: 1px solid #eee;
		font-size: 0.92rem;
	}
	th {
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #888;
	}
	code {
		font-size: 0.82rem;
		color: #777;
	}
</style>
