<script lang="ts">
	import { base } from '$app/paths';
	import ChordDiagram from '$songlib/ChordDiagram.svelte';
	import CapoFinder from '$lib/components/CapoFinder.svelte';
	import ChordBuilder from '$lib/components/ChordBuilder.svelte';
	import ChordChange from '$lib/components/ChordChange.svelte';
	import FretboardMap from '$lib/components/FretboardMap.svelte';
	import StringTuner from '$lib/components/StringTuner.svelte';
	import StrumTrainer from '$lib/components/StrumTrainer.svelte';
	import { transposeChord } from '$songlib/chords';

	// Movable-capo demo: the shapes stay the same, the sounding chord follows
	// the capo position one semitone per fret.
	const CAPO_SHAPES = ['Do', 'Re', 'Mi', 'Sol', 'La', 'Mim', 'Lam'];
	let capo = $state(2);

	const NOTES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
</script>

<svelte:head>
	<title>Impara la chitarra — Canzoniere Alessandria 2</title>
</svelte:head>

<nav><a href="{base}/">← Canzoniere</a></nav>
<h1>Impara la chitarra</h1>
<p class="intro">
	Tutto quello che serve per iniziare ad accompagnare i canti: com'è fatta la chitarra, come si
	leggono i diagrammi, come sono costruiti gli accordi, a cosa serve il capotasto e come si tiene
	il ritmo. Diverse parti si possono toccare e ascoltare: il suono viene generato dal telefono,
	quindi funziona anche senza rete.
</p>

<h2>La chitarra e le corde</h2>
<div class="card">
	<p>Le parti che servono per capire tutto il resto:</p>
	<ul>
		<li>
			<strong>Paletta e meccaniche</strong>: la testa della chitarra con le chiavette che tirano o
			allentano le corde per accordarle.
		</li>
		<li>
			<strong>Manico e tasti</strong>: le barrette metalliche dividono il manico in tasti. Premere
			una corda in un tasto la accorcia e alza la nota.
		</li>
		<li>
			<strong>Capotasto</strong>: la barretta bianca dove finisce il manico e iniziano le corde. Una
			corda suonata senza premere niente si dice <em>a vuoto</em>.
		</li>
		<li>
			<strong>Cassa e ponte</strong>: la cassa amplifica il suono, il ponte tiene ferme le corde
			dall'altro lato.
		</li>
	</ul>
	<p>
		Le corde sono 6 e si contano dal basso musicale: la 6ª è la più grossa (quella in alto quando
		suoni), la 1ª è la più sottile. Accordate da 6ª a 1ª danno:
	</p>
	<p class="tuning">
		<span>Mi</span><span>La</span><span>Re</span><span>Sol</span><span>Si</span><span>Mi</span>
	</p>
	<p class="hint">
		La 6ª e la 1ª sono entrambe Mi: quella grossa si chiama «Mi basso», quella sottile «Mi
		cantino». Per accordarti usa un accordatore (ce ne sono tanti gratis per telefono): all'inizio
		è la cosa più semplice e sicura.
	</p>
</div>

<h2>Come si tiene</h2>
<div class="card">
	<ul>
		<li>
			Siediti in avanti sulla sedia, schiena diritta, chitarra appoggiata sulla gamba del lato della
			mano che pizzica. La cassa sta contro la pancia, il manico punta un po' in alto.
		</li>
		<li>
			La mano che preme non regge la chitarra: se togli il braccio destro lo strumento deve restare
			su da solo. Se scivola, la sinistra si irrigidisce e gli accordi non suonano.
		</li>
		<li>
			<strong>Pollice</strong> dietro il manico, più o meno in mezzo, non aggrappato sopra il bordo.
			Le altre dita arrivano curve sulle corde, con l'unghia corta.
		</li>
		<li>
			<strong>Polso</strong> in fuori e non piegato all'estremo: se fa male, quasi sempre è il polso
			troppo storto o la spalla tirata su.
		</li>
	</ul>
	<p class="hint">
		In cerchio intorno al fuoco si finisce a suonare in piedi o accovacciati: cerca comunque di
		tenere il manico alto e il polso libero, altrimenti i barrè diventano impossibili.
	</p>
</div>

<h2>Accordarsi a orecchio</h2>
<div class="card">
	<p>
		Con l'accordatore è tutto più semplice, ma capita di non averlo. Tocca una corda qui sotto per
		sentire la sua nota e confrontarla con la tua:
	</p>
	<StringTuner />
	<p>
		Se hai almeno una corda giusta puoi accordare le altre da sola, col <strong>trucco del 5º
		tasto</strong>: la corda premuta al 5º tasto dà la stessa nota della corda più sottile accanto,
		suonata a vuoto. Vale per tutte le coppie tranne una:
	</p>
	<ul>
		<li>6ª al 5º tasto = 5ª a vuoto (La)</li>
		<li>5ª al 5º tasto = 4ª a vuoto (Re)</li>
		<li>4ª al 5º tasto = 3ª a vuoto (Sol)</li>
		<li>3ª al <strong>4º</strong> tasto = 2ª a vuoto (Si), l'eccezione</li>
		<li>2ª al 5º tasto = 1ª a vuoto (Mi)</li>
	</ul>
	<p class="hint">
		Suona le due corde una dopo l'altra e gira la meccanica di quella da accordare finché il
		«battimento», quel pulsare che senti quando due note sono vicine ma non uguali, sparisce. Tira
		sempre da sotto: se sei troppo alto, scendi e risali.
	</p>
</div>

<h2>Come leggere un diagramma</h2>
<div class="card">
	<div class="row">
		<div class="figure">
			<ChordDiagram name="Mi" scale={2.6} />
		</div>
		<ul>
			<li>
				Le linee verticali sono le 6 corde: a sinistra la 6ª (Mi basso), a destra la 1ª (Mi
				cantino).
			</li>
			<li>Le linee orizzontali sono le barrette: lo spazio tra due barrette è un tasto.</li>
			<li>
				I pallini dicono dove premere; il numero dentro è il dito: 1 indice, 2 medio, 3 anulare, 4
				mignolo.
			</li>
			<li>Un cerchietto sopra la corda = suonala a vuoto. Una ✕ = non suonarla.</li>
			<li>
				Se accanto al diagramma c'è un numero, la griglia non parte dal capotasto ma da quel
				tasto.
			</li>
		</ul>
	</div>
	<p class="hint">
		Premi con la punta delle dita, vicino alla barretta verso il corpo della chitarra, e tieni il
		pollice dietro il manico. All'inizio i polpastrelli fanno male: è normale e passa in pochi
		giorni.
	</p>
</div>

<h2>Che nota fa ogni tasto</h2>
<div class="card">
	<p>
		Le note sono 12 e poi si ripetono. La distanza tra una e la successiva si chiama
		<em>semitono</em>, e sulla chitarra un semitono = un tasto:
	</p>
	<p class="notes">
		{#each NOTES as n (n)}<span class:alt={n.includes('#')}>{n}</span>{/each}
	</p>
	<p>
		Le cinque note con il <em>diesis</em> (#) hanno due nomi per lo stesso tasto: Re# è un Re alzato
		di un semitono, ma è anche un Mi abbassato di un semitono, cioè un Mi <em>bemolle</em> (Mi♭).
		Qui e nei diagrammi trovi sempre i diesis; nei nomi degli accordi può comparire il bemolle.
	</p>
	<p>
		Ogni corda a vuoto suona la sua nota, e ogni tasto in più la alza di un semitono. La 3ª corda a
		vuoto è un <strong>Sol</strong>: premuta al 1º tasto dà Sol#, al 2º La, al 3º La#.
	</p>
	<p>
		Nella tabella qui sotto le corde sono in orizzontale, una per riga, dalla 6ª alla 1ª: è la
		stessa fila di corde dei diagrammi, girata di un quarto di giro.
	</p>
	<FretboardMap interactive />
	<p class="hint">
		Dopo 12 tasti le note ricominciano: al 12º tasto ogni corda ridà la sua nota a vuoto, un'ottava
		sopra. Prova a cercare lo stesso nome su corde diverse: il La della 5ª a vuoto lo ritrovi sulla
		3ª al 2º tasto, ed è per questo che lo stesso accordo si può fare in più punti del manico.
	</p>
</div>

<h2>Da dove nascono gli accordi</h2>
<div class="card">
	<p>
		Un accordo è un gruppo di note suonate insieme, e non è una forma da imparare a memoria: è il
		modo più comodo di raccogliere sotto le dita le note che servono. Quelli delle canzoni sono
		quasi tutti <em>triadi</em>: tre note scelte così, partendo dalla nota che dà il nome
		all'accordo (la <em>fondamentale</em>):
	</p>
	<ul>
		<li>
			<strong>Accordo maggiore</strong>: fondamentale + 4 semitoni (<em>terza maggiore</em>) + altri
			3 (<em>quinta</em>). Do = Do&nbsp;Mi&nbsp;Sol. Suona aperto, allegro.
		</li>
		<li>
			<strong>Accordo minore</strong>: fondamentale + 3 semitoni (<em>terza minore</em>) + altri 4.
			Dom = Do&nbsp;Mi♭&nbsp;Sol, dove Mi♭ è il tasto che nella lista sopra si chiama Re#. Suona più
			malinconico.
		</li>
	</ul>
	<p>
		Cambia una sola nota, ma il carattere cambia tutto. Si vede anche sulla chitarra: tra Mi e Mi
		minore la differenza è un dito.
	</p>
	<div class="row diagrams">
		<figure>
			<ChordDiagram name="Mi" scale={2.2} />
			<figcaption>Mi (maggiore)</figcaption>
		</figure>
		<figure>
			<ChordDiagram name="Mim" scale={2.2} />
			<figcaption>Mim (minore): via il dito 1</figcaption>
		</figure>
	</div>
	<p>
		Le sigle che trovi nel canzoniere si leggono così: <strong>La</strong> = La maggiore,
		<strong>Lam</strong> = La minore, <strong>La7</strong> = La con una quarta nota aggiunta (la
		<em>settima</em>). Sulle sei corde le note della triade si ripetono su più corde: per questo lo
		stesso accordo si può fare in posizioni diverse del manico.
	</p>
</div>

<h2>Costruisci un accordo</h2>
<div class="card">
	<p>
		Alla triade si può aggiungere una quarta nota, e quasi tutte le sigle strane del canzoniere
		nascono da lì. Le tre che incontri più spesso:
	</p>
	<ul>
		<li>
			<strong>La settima</strong> (Sol7, Lam7): la nota che sta 10 semitoni sopra la fondamentale.
			Crea attesa e spinge verso l'accordo successivo.
		</li>
		<li>
			<strong>La settima maggiore</strong> (Domaj7): un semitono più su, 11 dalla fondamentale.
			Suona morbida e sospesa, senza spingere da nessuna parte.
		</li>
		<li>
			<strong>Il sus4</strong> (Resus4): la terza sale di un semitono e diventa quarta. L'accordo
			resta in bilico, né maggiore né minore, e chiede di tornare sulla triade.
		</li>
	</ul>
	<p>
		Prendi il <strong>Lam</strong>, cioè La&nbsp;Do&nbsp;Mi. La settima di La è il Sol, e sulla
		chitarra ce l'hai già sotto le dita: la 3ª corda a vuoto <em>è</em> un Sol. Nel Lam quella corda
		è premuta al 2º tasto e suona un La, che raddoppia la fondamentale. Nella posizione di Lam7 qui
		sotto il Sol arriva invece dalla 1ª corda, al 3º tasto.
	</p>
	<p>
		Scegli la fondamentale, il tipo di accordo e cosa aggiungere: sotto vedi quale dito si sposta,
		che nota produce e che ruolo ha nell'accordo.
	</p>
	<ChordBuilder />
	<p class="hint">
		Le posizioni sono quelle stampate sul canzoniere. Lo stesso accordo si può fare anche altrove
		sul manico: quello che conta è che ci siano le note giuste, non che ci sia quella forma.
	</p>
</div>

<h2>Passare da un accordo all'altro</h2>
<div class="card">
	<p>
		Suonare un accordo è facile, cambiarlo a tempo è la parte difficile. Il trucco è non smontare la
		mano ogni volta: quasi sempre uno o due dita stanno già dove servono anche nell'accordo
		successivo, e restano giù come cardine mentre le altre si spostano.
	</p>
	<ChordChange />
	<p class="hint">
		Esercizio: due accordi, quattro pennate ciascuno, senza fermarsi mai. Se il cambio arriva in
		ritardo rallenta il tempo, non le dita. Meglio un passaggio lento e pulito che uno veloce e
		sporco.
	</p>
</div>

<h2>Il barrè</h2>
<div class="card">
	<div class="row">
		<div class="figure">
			<ChordDiagram name="Fa" scale={2.6} />
		</div>
		<div>
			<p>
				Nel barrè l'indice si stende su tutte le corde e le preme insieme sullo stesso tasto,
				facendo da capotasto mobile; le altre dita formano l'accordo davanti. Il Fa qui accanto è
				il primo che si incontra: un Mi spostato avanti di un tasto, con l'indice steso sul 1º.
			</p>
			<p class="hint">
				È l'ostacolo classico dei principianti: servono giorni (o settimane) di pratica. Tienilo
				per dopo, e intanto guarda la sezione sul capotasto: spesso permette di evitarlo.
			</p>
		</div>
	</div>
</div>

<h2>Il capotasto mobile (capo)</h2>
<div class="card">
	<p>
		Il capotasto mobile è una pinza che si aggancia al manico e preme tutte le corde su un tasto:
		da lì in poi è come se la chitarra ricominciasse. Le diteggiature restano le stesse, ma ogni
		tasto di capo alza il suono di un semitono.
	</p>
	<p>Serve a due cose:</p>
	<ul>
		<li>
			<strong>Cambiare tonalità senza cambiare accordi</strong>: se un canto è troppo basso o
			troppo alto per le voci, sposti il capo e continui a suonare le stesse posizioni.
		</li>
		<li>
			<strong>Evitare gli accordi difficili</strong>: con il capo al posto giusto molti barrè
			diventano posizioni aperte semplici.
		</li>
	</ul>
	<div class="capo">
		<div class="capo-picker">
			<span>Capo al tasto:</span>
			{#each [0, 1, 2, 3, 4, 5] as f (f)}
				<button class="chip" class:on={capo === f} onclick={() => (capo = f)} aria-pressed={capo === f}>
					{f === 0 ? 'no' : f}
				</button>
			{/each}
		</div>
		<div class="capo-table" role="table" aria-label="Effetto del capotasto sugli accordi">
			<div class="capo-row head" role="row">
				<span role="columnheader">Diteggiatura</span>
				<span role="columnheader">Si sente</span>
			</div>
			{#each CAPO_SHAPES as s (s)}
				<div class="capo-row" role="row">
					<span role="rowheader">{s}</span>
					<span role="cell" class="sounds">{transposeChord(s, capo)}</span>
				</div>
			{/each}
		</div>
		<p class="hint">
			Esempio: con il capo al 2º tasto, la posizione del Re suona come un {transposeChord('Re', 2)}.
		</p>
	</div>
	<p>
		Di solito però il problema arriva dall'altra parte: sai che accordo ti serve e vuoi evitare il
		barrè. Scegli l'accordo e la pagina cerca un tasto di capo che lo trasformi in una posizione
		aperta:
	</p>
	<CapoFinder />
</div>

<h2>La mano destra: il ritmo</h2>
<div class="card">
	<p>
		La mano destra suona le corde con pennate verso il basso (↓) o verso l'alto (↑), con il plettro o con il
		pollice. Il segreto è che il braccio continua a oscillare come un pendolo, sempre a tempo: per
		saltare una pennata basta non toccare le corde, senza fermare il movimento.
	</p>
	<p>Due ritmi che accompagnano quasi tutto il canzoniere:</p>
	<ul>
		<li>
			<strong>Base</strong>: solo pennate in giù, una per battito: <span class="strum">↓ ↓ ↓ ↓</span>
		</li>
		<li>
			<strong>Il classico</strong>: <span class="strum">↓ ↓↑ ↑↓↑</span>, da dire mentre suoni:
			«giù, giù-su, su-giù-su».
		</li>
	</ul>
	<p>Prova a tempo: scegli il ritmo, l'accordo e la velocità, poi segui la freccia accesa.</p>
	<StrumTrainer />
	<p class="hint">
		Prima di tutto questo: tieni un accordo solo e dai le pennate a tempo con il canto. Poi aggiungi il
		cambio di accordo, all'inizio rallentando senza fermarti mai.
	</p>
</div>

<h2>Perché quegli accordi e non altri</h2>
<div class="card">
	<p>
		Un canto non pesca accordi a caso: ne usa un gruppetto che sta bene insieme, quello della sua
		<em>tonalità</em>. La tonalità prende il nome dall'accordo su cui il canto si appoggia e finisce,
		e gli altri accordi sono i suoi vicini di casa. Tre giri coprono buona parte del canzoniere:
	</p>
	<ul>
		<li><strong>Tonalità di Do</strong>: Do, Fa, Sol, Lam. Il giro classico è Do Sol Lam Fa.</li>
		<li><strong>Tonalità di Sol</strong>: Sol, Do, Re, Mim. Giro: Sol Re Mim Do.</li>
		<li><strong>Tonalità di Lam</strong> (malinconica): Lam, Rem, Mi o Mi7, Fa, Sol.</li>
	</ul>
	<p>
		Da qui nascono due cose che vedi in giro per il canzoniere. La prima: l'accordo che «chiama» il
		ritorno a casa è quello con la settima (Sol7 in Do, Re7 in Sol, Mi7 in Lam), ed è per questo che
		lo trovi quasi sempre in fondo alla strofa. La seconda: se un canto è in una tonalità scomoda,
		non serve cambiare accordi uno per uno, basta spostare tutto della stessa quantità, che è
		esattamente quello che fanno il capotasto e il tasto di trasporto del canzoniere.
	</p>
	<p class="hint">
		Se non sai in che tonalità è un canto, guarda l'ultimo accordo: nove volte su dieci è quello che
		dà il nome alla tonalità.
	</p>
</div>

<h2>Come si legge una pagina del canzoniere</h2>
<div class="card">
	<ul>
		<li>
			L'accordo è scritto <strong>sopra la sillaba</strong> in cui va cambiato, non a inizio riga: il
			cambio cade esattamente lì, mentre canti quella sillaba.
		</li>
		<li>
			Se un accordo resta lo stesso per due righe, non viene ripetuto: continui a suonare quello di
			prima.
		</li>
		<li>
			Il ritornello è rientrato e marcato: torna più volte identico, quindi conviene impararlo per
			primo.
		</li>
		<li>
			Le sigle sono in notazione latina (Do, Re, Mi) come nel resto d'Italia; su internet trovi le
			stesse cose in notazione inglese (C, D, E).
		</li>
	</ul>
	<p>
		Sull'app ogni canto ha i pulsanti per <strong>trasportare</strong> (spostare tutti gli accordi
		insieme, per adattarli alle voci), per <strong>semplificare</strong> (le settime e i sus
		diventano accordi base) e per nascondere del tutto gli accordi quando ti serve solo il testo.
	</p>
	<p class="hint">
		Trasporto e capotasto risolvono lo stesso problema in due modi: il trasporto cambia gli accordi
		scritti, il capo li lascia uguali e sposta lo strumento.
	</p>
</div>

<h2>Da dove cominciare</h2>
<div class="card">
	<ol>
		<li>Accorda la chitarra (con un accordatore, o a orecchio col trucco del 5º tasto).</li>
		<li>Impara 2 o 3 accordi aperti e falli suonare puliti, corda per corda.</li>
		<li>Passa da un accordo all'altro lentamente, senza guardare il ritmo.</li>
		<li>Aggiungi la pennata base e poi il ritmo «classico», col metronomo lento.</li>
		<li>Scegli un canto con pochi accordi e suonalo tutto, anche piano.</li>
	</ol>
	<p>
		Per i punti 2 e 5 c'è una pagina fatta apposta:
		<a href="{base}/accordi/">Cosa posso suonare</a> ti dice quali accordi conviene imparare prima,
		come mettere le dita e quali canti puoi già accompagnare con quelli che sai.
	</p>
	<p>
		Mentre suoni, la <a href="{base}/impostazioni/">modalità studente</a> porta questa pagina dentro
		i canti: gli accordi sopra le parole si toccano e si aprono sulla loro scheda, ogni canto dice
		quanto sei pronto e il pulsante «Studia» lo smonta in accordi, cambi e suonata finale.
	</p>
	<p class="hint">
		Meglio 10 minuti tutti i giorni che un'ora una volta a settimana. E suona con gli altri appena
		puoi: si impara il doppio.
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

	.card p {
		margin: 0 0 10px;
	}

	.card p:last-child {
		margin-bottom: 0;
	}

	.card ul,
	.card ol {
		margin: 0 0 10px;
		padding-left: 20px;
	}

	.card li {
		margin-bottom: 6px;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px 20px;
	}

	.row > ul,
	.row > div:not(.figure) {
		flex: 1 1 220px;
		min-width: 0;
	}

	.figure {
		flex: 0 0 auto;
	}

	.diagrams {
		justify-content: flex-start;
		gap: 8px 32px;
		margin-bottom: 10px;
	}

	.diagrams figure {
		margin: 0;
		text-align: center;
	}

	.diagrams figcaption {
		font-size: 13px;
		color: var(--muted);
		margin-top: 2px;
	}

	.tuning {
		display: flex;
		gap: 6px;
	}

	.tuning span {
		flex: 0 0 auto;
		min-width: 40px;
		text-align: center;
		padding: 6px 0;
		border: 1px solid var(--control-border);
		border-radius: 8px;
		font-weight: 600;
	}

	.notes {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.notes span {
		padding: 4px 7px;
		border: 1px solid var(--control-border);
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
	}

	.notes span.alt {
		color: var(--muted);
		font-weight: 400;
	}

	.hint {
		color: var(--muted);
		font-size: 13px;
	}

	.strum {
		font-weight: 700;
		letter-spacing: 0.15em;
		white-space: nowrap;
	}

	.capo-picker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
	}

	.chip {
		font: inherit;
		font-size: 14px;
		min-width: 40px;
		padding: 6px 8px;
		border: 1px solid var(--control-border);
		border-radius: 999px;
		background: var(--surface);
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
	}

	.chip.on {
		background: var(--active-bg);
		border-color: var(--active-bg);
		color: var(--active-text);
	}

	.capo-table {
		max-width: 320px;
		margin-bottom: 10px;
	}

	.capo-row {
		display: flex;
	}

	.capo-row span {
		flex: 1;
		padding: 6px 4px;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.capo-row.head span {
		font-size: 13px;
		color: var(--muted);
		font-weight: 600;
	}

	.capo-row:last-child span {
		border-bottom: none;
	}

	.sounds {
		color: var(--chord);
		font-weight: 600;
	}
</style>
