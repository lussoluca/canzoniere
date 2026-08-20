<script lang="ts">
	import { base } from '$app/paths';
	import { allSongs, categories } from '$lib/data';
	import { FEEDBACK_EMAIL, feedbackHref } from '$lib/feedback';

	const songCount = allSongs.length;
	const categoryCount = categories.length;
</script>

<svelte:head>
	<title>Crediti — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Crediti</h1>
<p class="intro">
	Chi ha scelto i canti, chi ha costruito l'applicazione e a chi appartengono i diritti sui brani.
</p>

<h2>I canti</h2>
<div class="card">
	<p>
		I {songCount} canti raccolti qui, divisi in {categoryCount} categorie, sono stati scelti dai ragazzi
		del reparto del <strong>Gruppo Scout Alessandria 2</strong>: sono i canti che si cantano davvero
		attorno al fuoco, in route, alle veglie e alle messe.
	</p>
</div>

<h2>L'applicazione</h2>
<div class="card">
	<p>
		Il canzoniere digitale — la web app, l'editor dei canti e il PDF stampabile — è stato realizzato
		da <strong>Luca Lusso</strong>.
	</p>
	<p class="muted">
		Segnalazioni, correzioni e richieste di nuovi canti sono benvenute: usa la pagina
		<a href="{base}/suggerimenti/">Commenti e suggerimenti</a>.
	</p>
</div>

<h2>Diritti d'autore</h2>
<div class="card">
	<p>
		I testi e le musiche dei brani riprodotti in questa applicazione sono di proprietà dei
		rispettivi autori ed editori, ai quali appartengono tutti i diritti di utilizzazione economica
		e i diritti morali ai sensi della legge 22 aprile 1941 n. 633 sul diritto d'autore.
	</p>
	<p>
		Questa raccolta non ha alcuna finalità di lucro e non viene venduta né distribuita
		commercialmente: i testi sono riprodotti al solo scopo di studio, di preghiera e di animazione
		delle attività educative del gruppo scout.
	</p>
	<p>
		Le eventuali attribuzioni indicate nei singoli canti sono riportate in buona fede sulla base
		delle fonti disponibili e possono essere incomplete o imprecise.
	</p>
	<p class="muted">
		Se sei titolare dei diritti su uno dei brani e desideri correggere l'attribuzione o richiedere
		la rimozione del testo, scrivi a
		<a
			href={feedbackHref(
				'Segnalazione diritti d’autore',
				'Indica il titolo del canto e la richiesta (correzione dell’attribuzione o rimozione del testo).'
			)}>{FEEDBACK_EMAIL}</a
		>: il contenuto sarà corretto o rimosso senza indugio.
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
		padding: 14px;
	}

	.card p {
		margin: 0 0 10px;
		font-size: 15px;
		line-height: 1.5;
	}

	.card p:last-child {
		margin-bottom: 0;
	}

	.card p.muted {
		color: var(--muted);
		font-size: 14px;
	}
</style>
