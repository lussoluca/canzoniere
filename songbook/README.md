# songbook

Tool in Go che genera un canzoniere PDF (solo testo, accordi rimossi) a partire da una lista di canzoni. Le canzoni sono i file ChordPro in `canzoni/`; la lista è un file di testo, di norma in `canzonieri/`.

## Prerequisiti

- [Go](https://go.dev/) 1.21+

## Build del tool

```bash
cd songbook
go build -o songbook .
cd ..
```

## Creare la lista delle canzoni

Crea un file di testo (es. `canzonieri/mio_evento.txt`) con una canzone per riga.  
Puoi usare il percorso relativo del file `.cho` oppure il titolo esatto della canzone:

```
# percorso relativo (consigliato)
chiesa/alleluia_servire_e.cho
clan/e_la_strada_si_apre.cho

# oppure titolo esatto (case-insensitive)
Cucciolo d'uomo
```

Le righe che iniziano con `#` sono ignorate. L'ordine delle righe determina l'ordine delle canzoni nel PDF.

I file `.txt` in `canzonieri/` si possono creare e modificare anche con l'editor web (vedi [`../editor/README.md`](../editor/README.md)).

## Generare il PDF

```bash
./songbook/songbook \
  -input=canzonieri/mio_evento.txt \
  -output=canzonieri/mio_evento.pdf \
  -songs=canzoni
```

In alternativa, senza compilare il binario: `go run ./songbook -input=canzonieri/mio_evento.txt -output=canzonieri/mio_evento.pdf`.

### Opzioni

| Flag            | Default          | Descrizione                                           |
| --------------- | ---------------- | ----------------------------------------------------- |
| `-input`        | _(obbligatorio)_ | File con la lista delle canzoni                       |
| `-output`       | `songbook.pdf`   | File PDF di output                                    |
| `-songs`        | `canzoni`        | Directory contenente i file `.cho`                    |
| `-dedup-chorus` | `false`          | Sostituisce i ritornelli ripetuti identici con "Rit." |

## Lista delle canzoni disponibili

```bash
grep -rh "^{title:" canzoni/ | sed 's/{title://;s/}//' | sort
```
