<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { loadStudentMode, saveStudentMode } from '#lib/student.js';

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

<svelte:head><title>Impostazioni — Canzoniere Alessandria 2</title></svelte:head>
<nav><a href="{resolve('/')}">← Canzoniere</a></nav>
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
		<a href={resolve(`accordi/`)}>Cosa posso suonare</a>
		, e la teoria dietro le schede sta tutta in 
		<a href={resolve(`impara/`)}>Impara la chitarra</a>
		.
	</p>
</div>

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

	h2 {
		font-size: var(--text-lg);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--muted);
		margin: var(--space-8) 0 var(--space-4);
	}

	.card {
		border: 1px solid var(--control-border);
		border-radius: var(--radius-lg);
		background: var(--surface);
		padding: var(--space-5) var(--space-6);
		font-size: var(--text-md);
	}

	.row {
		display: flex;
		align-items: flex-start;
		gap: var(--space-6);
	}

	.row strong {
		font-size: var(--text-lg);
	}

	.what {
		margin: var(--space-1) 0 0;
	}

	.switch {
		flex: 0 0 auto;
		font: inherit;
		font-size: var(--text-md);
		font-weight: 500;
		padding: var(--space-3) var(--space-7);
		border: 1px solid var(--control-border);
		border-radius: var(--radius-pill);
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
		margin: var(--space-5) 0 0;
		padding-left: var(--space-8);
	}

	li {
		margin-bottom: var(--space-3);
	}

	.hint {
		margin: var(--space-4) 0 0;
		color: var(--muted);
		font-size: var(--text-sm);
	}
</style>
