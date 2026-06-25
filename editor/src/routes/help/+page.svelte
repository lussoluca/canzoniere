<svelte:head>
	<title>Guida · Canzoniere</title>
</svelte:head>

<div class="help">
	<h2>Guida all'uso</h2>
	<p class="intro">
		Questo editor gestisce due cose: le <strong>canzoni</strong> (i singoli brani con testo e
		accordi) e i <strong>canzonieri</strong> (le raccolte di canzoni preparate per un evento). Qui
		sotto trovi come crearle, modificarle ed eliminarle.
	</p>

	<nav class="toc">
		<a href="#canzoni">Canzoni</a>
		<a href="#editor">Editor della canzone</a>
		<a href="#accordi">Strumenti per gli accordi</a>
		<a href="#categorie">Categorie</a>
		<a href="#canzonieri">Canzonieri</a>
	</nav>

	<section id="canzoni">
		<h3>Canzoni</h3>
		<p>
			Dalla voce <strong>Canzoni</strong> del menu in alto vedi le canzoni raggruppate per
			<strong>categoria</strong> (le cartelle 📁). Ogni cartella mostra quante canzoni contiene;
			cliccala per aprire l'elenco di quella categoria.
		</p>
		<dl>
			<dt>Creare</dt>
			<dd>
				Premi <strong>+ Nuova canzone</strong> in alto a destra. Compila almeno il
				<strong>Titolo</strong> (è obbligatorio), scegli la categoria e salva con
				<strong>Crea</strong>. Il nome del file viene generato dal titolo.
			</dd>
			<dt>Modificare</dt>
			<dd>
				Apri una categoria e clicca sulla canzone: si apre l'editor. Cambia testo, accordi o i dati
				in alto, poi premi <strong>Salva</strong>.
			</dd>
			<dt>Spostare di categoria</dt>
			<dd>
				Nell'editor cambia il campo <strong>Categoria</strong> e salva: la canzone viene spostata
				nella nuova cartella.
			</dd>
			<dt>Eliminare</dt>
			<dd>Usa il comando di eliminazione nell'elenco della categoria; ti viene chiesta conferma.</dd>
		</dl>
	</section>

	<section id="editor">
		<h3>Editor della canzone</h3>
		<p>In alto imposti i dati del brano:</p>
		<ul>
			<li><strong>Titolo</strong> — obbligatorio, da' anche il nome al file.</li>
			<li><strong>Artista</strong> — autore o interprete.</li>
			<li>
				<strong>Colonne</strong> — su quante colonne stampare il testo nel PDF (da 1 a 4); lascialo
				vuoto per il valore predefinito.
			</li>
			<li>
				<strong>Categoria</strong> — la cartella in cui vive la canzone; viene usata anche per
				raggruppare i brani nell'indice del PDF.
			</li>
		</ul>
		<p>Il corpo della canzone si modifica con due schede:</p>
		<ul>
			<li>
				<strong>Editor visuale</strong> — scrivi il testo e posizioni gli accordi sopra le parole
				riga per riga, senza conoscere la sintassi.
			</li>
			<li>
				<strong>ChordPro</strong> — il testo grezzo in formato ChordPro (accordi tra
				<code>[ ]</code>, direttive tra <code>{`{ }`}</code>) per chi preferisce scrivere a mano. Le
				due schede sono sincronizzate.
			</li>
		</ul>
		<p>
			L'indicatore <strong>● Modifiche non salvate</strong> compare quando ci sono cambiamenti non
			ancora salvati; se provi a uscire dalla pagina ti viene chiesta conferma.
		</p>
	</section>

	<section id="accordi">
		<h3>Strumenti per gli accordi</h3>
		<p>Nella barra delle schede ci sono tre comandi che agiscono su tutti gli accordi del brano:</p>
		<ul>
			<li>
				<strong>A→La</strong> — converte la notazione dall'inglese (A, B, C…) al latino (La, Si,
				Do…).
			</li>
			<li><strong>−1</strong> — traspone tutti gli accordi un semitono più in basso.</li>
			<li><strong>+1</strong> — traspone tutti gli accordi un semitono più in alto.</li>
		</ul>
	</section>

	<section id="categorie">
		<h3>Categorie</h3>
		<p>
			Dalla voce <strong>Categorie</strong> del menu gestisci le cartelle in cui sono organizzate le
			canzoni. Le modifiche si riflettono direttamente sul filesystem. La categoria determina anche
			il <code>{`{tag:…}`}</code> usato per raggruppare i brani nell'indice del PDF.
		</p>
		<dl>
			<dt>Creare</dt>
			<dd>
				Scrivi un nome nel campo in alto e premi <strong>Crea</strong>. Il nome viene reso minuscolo
				e gli spazi sostituiti con <code>_</code> (viene creata una cartella vuota).
			</dd>
			<dt>Rinominare</dt>
			<dd>
				Premi <strong>Rinomina</strong> sulla riga, scrivi il nuovo nome e salva. La cartella viene
				rinominata e il <code>{`{tag:…}`}</code> di tutte le canzoni al suo interno viene riscritto di
				conseguenza.
			</dd>
			<dt>Riordinare</dt>
			<dd>
				Usa <strong>↑</strong>/<strong>↓</strong> sulla riga per cambiare l'ordine delle categorie.
				L'ordine scelto vale ovunque (home, elenchi, selettori) e viene salvato nel file
				<code>.categories.json</code> dentro <code>canzoni/</code>; le categorie non ancora elencate
				lì vengono mostrate in coda in ordine alfabetico.
			</dd>
			<dt>Eliminare</dt>
			<dd>
				Premi <strong>Elimina</strong> sulla riga. Se la categoria contiene canzoni ti viene chiesto
				in quale categoria esistente spostarle; dopo lo spostamento la cartella viene rimossa. Non è
				possibile eliminare l'unica categoria rimasta.
			</dd>
		</dl>
	</section>

	<section id="canzonieri">
		<h3>Canzonieri</h3>
		<p>
			Dalla voce <strong>Canzonieri</strong> del menu gestisci le raccolte. La tabella elenca i
			canzonieri esistenti con il numero di canzoni di ciascuno.
		</p>
		<dl>
			<dt>Creare</dt>
			<dd>
				Scrivi un nome nel campo in alto e premi <strong>Crea</strong>. Gli spazi vengono sostituiti
				con <code>_</code> e il nome reso minuscolo.
			</dd>
			<dt>Comporre</dt>
			<dd>
				Apri un canzoniere: a sinistra c'è l'elenco delle canzoni incluse, a destra il selettore di
				tutte le canzoni disponibili. Premi <strong>＋</strong> per aggiungerne una, oppure cerca per
				titolo nel campo di ricerca.
			</dd>
			<dt>Ordinare e rimuovere</dt>
			<dd>
				Nell'elenco a sinistra usa <strong>↑</strong>/<strong>↓</strong> per cambiare l'ordine delle
				canzoni e <strong>✕</strong> per togliere un brano. Una canzone marcata
				<span class="warn">⚠︎</span> indica un file non più trovato.
			</dd>
			<dt>Salvare</dt>
			<dd>
				Le modifiche al canzoniere non sono automatiche: premi <strong>Salva</strong> in alto per
				memorizzarle.
			</dd>
			<dt>Eliminare</dt>
			<dd>
				Dalla tabella dei canzonieri usa <strong>Elimina</strong> sulla riga; ti viene chiesta
				conferma.
			</dd>
		</dl>
	</section>
</div>

<style>
	.help {
		max-width: 760px;
	}
	h2 {
		margin: 0.4rem 0 0.8rem;
	}
	.intro {
		color: #555;
		line-height: 1.6;
	}
	.toc {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		margin: 1rem 0 1.6rem;
	}
	.toc a {
		font-size: 0.85rem;
		text-decoration: none;
		color: #2f3e46;
		background: #fff;
		border: 1px solid #e2e2e2;
		border-radius: 999px;
		padding: 0.25rem 0.7rem;
	}
	.toc a:hover {
		background: #eef3f4;
	}
	section {
		background: #fff;
		border-radius: 10px;
		padding: 1.1rem 1.3rem;
		margin-bottom: 1rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	section h3 {
		margin: 0 0 0.6rem;
		font-size: 1.05rem;
	}
	p {
		line-height: 1.6;
	}
	ul {
		line-height: 1.6;
	}
	dl {
		margin: 0;
	}
	dt {
		font-weight: 700;
		margin-top: 0.7rem;
	}
	dd {
		margin: 0.15rem 0 0;
		line-height: 1.55;
		color: #444;
	}
	code {
		background: #f0efec;
		border-radius: 4px;
		padding: 0.05rem 0.3rem;
		font-size: 0.88em;
	}
	.warn {
		color: #b3261e;
	}
</style>
