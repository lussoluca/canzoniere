<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { sendSuggestion } from '#lib/feedback.js';

	let song = $state('');
	let name = $state('');
	let message = $state('');
	let sending = $state(false);
	let issueUrl = $state('');
	let error = $state('');

	// The song comes from the ?canto= query param. Client-side navigation can
	// land on this route without remounting it (song page link, then the menu
	// entry), so the field follows the URL instead of being read once on mount.
	$effect(() => {
		song = page.url.searchParams.get('canto') ?? '';
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!message.trim() || sending) return;
		sending = true;
		error = '';
		try {
			issueUrl = await sendSuggestion({
				message: message.trim(),
				song: song.trim() || undefined,
				name: name.trim() || undefined
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Invio non riuscito, riprova.';
		} finally {
			sending = false;
		}
	}

	function reset() {
		issueUrl = '';
		message = '';
	}
</script>

<svelte:head><title>Suggerimenti — Canzoniere Alessandria 2</title></svelte:head>
<nav><a href="{resolve('/')}">← Canzoniere</a></nav>
<h1>Commenti e suggerimenti</h1>
<p class="intro">
	Un errore in un testo, un accordo sbagliato, un canto che manca: scrivilo qui e arriva dritto a
	chi cura il canzoniere.
</p>

{#if issueUrl}
	<div class="card">
		<p class="done">✅ Grazie, suggerimento inviato!</p>
		<p class="what">
			È stato registrato ed è consultabile
			<a href={issueUrl} target="_blank" rel="noopener">qui</a>.
		</p>
		<button class="secondary" onclick={reset}>Invia un altro suggerimento</button>
	</div>
{:else}
	<form class="card" onsubmit={submit}>
		<label>
			Canto (se riguarda un canto)
			<input type="text" bind:value={song} placeholder="Titolo del canto" maxlength="120" />
		</label>
		<label>
			Il tuo nome (facoltativo)
			<input type="text" bind:value={name} placeholder="Come ti chiami" maxlength="80" />
		</label>
		<label>
			Messaggio
			<textarea
				bind:value={message}
				required
				rows="6"
				placeholder="Ho notato che…"
				maxlength="3000"
			></textarea>
		</label>
		{#if error}
			<p class="error">{error}</p>
		{/if}
		<button type="submit" disabled={sending || !message.trim()}>
			{sending ? 'Invio in corso…' : 'Invia'}
		</button>
	</form>
{/if}

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
		margin: 0 0 var(--space-1);
	}

	.intro {
		margin: 0 0 var(--space-5);
		color: var(--muted);
		font-size: var(--text-md);
	}

	.card {
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		padding: var(--space-6) var(--space-7);
		display: flex;
		flex-direction: column;
		gap: var(--space-5);
	}

	label {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
		font-size: var(--text-sm);
		color: var(--muted);
	}

	input,
	textarea {
		font: inherit;
		font-size: var(--text-xl);
		color: var(--text);
		background: var(--bg);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
	}

	textarea {
		resize: vertical;
		min-height: 110px;
	}

	input:focus,
	textarea:focus {
		outline: 2px solid var(--link);
		outline-offset: -1px;
	}

	button {
		font: inherit;
		font-size: var(--text-lg);
		font-weight: 600;
		border: none;
		border-radius: var(--radius-md);
		padding: var(--space-4) var(--space-6);
		background: var(--active-bg);
		color: var(--active-text);
		cursor: pointer;
	}

	button:disabled {
		opacity: 0.5;
		cursor: default;
	}

	button.secondary {
		background: transparent;
		color: var(--link);
		border: 1px solid var(--control-border);
		font-weight: 500;
	}

	.done {
		margin: 0;
		font-weight: 600;
	}

	.what {
		margin: 0;
		font-size: var(--text-md);
		color: var(--muted);
	}

	.error {
		margin: 0;
		font-size: var(--text-md);
		color: var(--danger);
	}
</style>
