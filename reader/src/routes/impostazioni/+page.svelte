<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { loadStudentMode, saveStudentMode } from '$lib/student';

	let student = $state(false);
	let ready = $state(false);

	onMount(() => {
		student = loadStudentMode();
		ready = true;
	});

	function toggle() {
		student = !student;
		saveStudentMode(student);
	}
</script>

<svelte:head>
	<title>Impostazioni — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Impostazioni</h1>
<p class="intro">
	Le impostazioni restano su questo dispositivo: chi apre il canzoniere da un altro telefono trova
	le sue.
</p>

<h2>Modalità studente</h2>
<div class="card">
	<div class="row">
		<div>
			<strong>Impara mentre suoni</strong>
			<p class="what">
				Con la modalità studente accesa ogni canto diventa anche una lezione. Con la modalità
				spenta il canzoniere resta esattamente com'è.
			</p>
		</div>
		{#if ready}
			<button class="switch" class:on={student} onclick={toggle} aria-pressed={student}>
				{student ? 'Accesa' : 'Spenta'}
			</button>
		{/if}
	</div>
	<ul>
		<li>
			<strong>Gli accordi sopra le parole si toccano</strong>: si apre il diagramma, dove vanno le
			dita, il suono dell'accordo e la prova col microfono.
		</li>
		<li>
			<strong>Sotto il titolo compare quanto sei pronto</strong>: quali accordi del canto sai già,
			quali mancano e, quando c'è, il trasporto che lo rende suonabile con i soli accordi che
			conosci.
		</li>
		<li>
			<strong>Il pulsante «Studia»</strong> apre un percorso in tre passi: gli accordi del canto, i
			cambi che il canto chiede davvero col metronomo, e la suonata finale col copilota.
		</li>
	</ul>
	<p class="hint">
		Gli accordi che segni come «lo so fare» sono gli stessi di
		<a href="{base}/accordi/">Cosa posso suonare</a>, e la teoria dietro le schede sta tutta in
		<a href="{base}/impara/">Impara la chitarra</a>.
	</p>
</div>

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
		margin: 0 0 4px;
	}

	.intro {
		margin: 0 0 12px;
		color: var(--muted);
		font-size: 14px;
	}

	h2 {
		font-size: 15px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin: 22px 0 10px;
	}

	.card {
		border: 1px solid var(--control-border);
		border-radius: 10px;
		background: var(--surface);
		padding: 12px 14px;
		font-size: 14px;
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: 14px;
	}

	.row strong {
		font-size: 15px;
	}

	.what {
		margin: 4px 0 0;
	}

	.switch {
		flex: 0 0 auto;
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		padding: 8px 16px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: transparent;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.switch.on {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	ul {
		margin: 12px 0 0;
		padding-left: 20px;
	}

	li {
		margin-bottom: 8px;
	}

	.hint {
		margin: 10px 0 0;
		color: var(--muted);
		font-size: 13px;
	}
</style>
