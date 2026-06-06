# Canzoniere Alessandria 2

## 📥 Download

L'ultima versione del canzoniere è disponibile qui:
**[https://lussoluca.github.io/canzoniere](https://lussoluca.github.io/canzoniere)**

## 🎵 Creare un canzoniere personalizzato

### Prerequisiti

- [Go](https://go.dev/) 1.21+

### Build del tool

```bash
cd songbook
go build -o songbook .
cd ..
```

### Creare la lista delle canzoni

Crea un file di testo (es. `canzonieri/mio_evento.txt`) con una canzone per riga.  
Puoi usare il percorso relativo del file `.cho` oppure il titolo esatto della canzone:

```
# percorso relativo (consigliato)
chiesa/alleluia_servire_e.cho
clan/e_la_strada_si_apre.cho

# oppure titolo esatto (case-insensitive)
Cucciolo d'uomo
```

Le righe che iniziano con `#` sono ignorate.

### Generare il PDF

```bash
./songbook/songbook \
  -input=canzonieri/mio_evento.txt \
  -output=canzonieri/mio_evento.pdf \
  -songs=canzoni
```

**Opzioni:**

| Flag            | Default          | Descrizione                                           |
| --------------- | ---------------- | ----------------------------------------------------- |
| `-input`        | _(obbligatorio)_ | File con la lista delle canzoni                       |
| `-output`       | `songbook.pdf`   | File PDF di output                                    |
| `-songs`        | `canzoni`        | Directory contenente i file `.cho`                    |
| `-dedup-chorus` | `false`          | Sostituisce i ritornelli ripetuti identici con "Rit." |

### Lista delle canzoni disponibili

```bash
grep -rh "^{title:" canzoni/ | sed 's/{title://;s/}//' | sort
```
