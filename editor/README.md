# Editor del Canzoniere

Applicazione web (SvelteKit + Svelte 5) per gestire le canzoni in `canzoni/` e i canzonieri per eventi in `canzonieri/`, con un editor visuale che permette di posizionare gli accordi sul testo senza scrivere a mano la sintassi ChordPro.

## Avvio

Prerequisiti: [Node.js](https://nodejs.org/) 20+.

```bash
cd editor
npm install
npm run dev
```

In alternativa, dalla radice del repository: `make dev`.

L'app legge e scrive direttamente i file `.cho` in `canzoni/` e i file `.txt` in `canzonieri/`.

## Funzionalità

### Canzoni

- **Home a cartelle**: le categorie (`branco`, `reparto`, `clan`, `canti_scout`, `chiesa`, `varie`) sono mostrate come cartelle con il numero di canzoni.
- **Pagina categoria**: elenco delle canzoni con ricerca per titolo/artista, eliminazione e spostamento in un'altra categoria (lo spostamento riscrive il `{tag:...}` perché corrisponda alla nuova categoria).
- **Editor della canzone**: form dei metadati (titolo, artista, colonne, categoria — il tag è derivato dalla categoria al salvataggio, non si modifica a mano) e due schede sincronizzate:
  - **Editor visuale** — gli accordi sono "pillole" sopra il testo: clic su un carattere per aggiungere un accordo, clic su una pillola per modificarlo o rimuoverlo, trascinamento per spostarlo. Strumenti di riga per modificare il testo (Invio conferma, Esc annulla), aggiungere/eliminare righe, marcatori di ritornello e commenti.
  - **ChordPro** — sorgente grezzo con evidenziazione della sintassi (metadati, accordi, marcatori di ritornello, commenti).
- **Strumenti accordi** (in entrambe le schede): conversione da notazione inglese a latina (`Am` → `Lam`) e trasposizione di tutti gli accordi di ±1 semitono.

### Canzonieri per eventi

- Elenco, creazione ed eliminazione dei canzonieri in `canzonieri/`.
- Modifica di un canzoniere: aggiunta, rimozione e riordino delle canzoni (mostrate per titolo). Il salvataggio scrive il file `.txt` nel formato usato dal tool Go in `songbook/` (un percorso `categoria/file.cho` per riga).

## Comandi

| Comando           | Descrizione                           |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Server di sviluppo                    |
| `npm run build`   | Build di produzione                   |
| `npm run preview` | Anteprima della build di produzione   |
| `npm run check`   | Controllo dei tipi con `svelte-check` |
| `npm test`        | Test end-to-end con Playwright        |

## Test

I test end-to-end (Playwright) usano directory temporanee isolate (`e2e/.tmp-songs` e `e2e/.tmp-songbooks`) e non toccano mai i dati reali.

```bash
npm test
```

## Variabili d'ambiente

| Variabile       | Default         | Descrizione                     |
| --------------- | --------------- | ------------------------------- |
| `SONGS_DIR`     | `../canzoni`    | Directory dei file `.cho`       |
| `SONGBOOKS_DIR` | `../canzonieri` | Directory dei canzonieri `.txt` |
