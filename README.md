# Canzoniere Alessandria 2

## 📥 Download

L'ultima versione del canzoniere è disponibile qui:
**[https://lussoluca.github.io/canzoniere](https://lussoluca.github.io/canzoniere)**

## 📱 Reader (web app / iPad)

Per sfogliare i canti (con trasposizione, semplificazione degli accordi e ricerca) c'è una web app statica in [`reader/`](reader/), pubblicata su
**[https://lussoluca.github.io/canzoniere/app/](https://lussoluca.github.io/canzoniere/app/)**.

Su iPad: aprire l'URL in Safari e usare _Condividi → Aggiungi a schermata Home_; l'app funziona anche offline.

```bash
cd reader && npm install && npm run dev
```

## ✏️ Editor web

Per aggiungere, modificare ed eliminare le canzoni (con un editor visuale degli accordi) e per gestire i canzonieri per eventi è disponibile un'applicazione web in [`editor/`](editor/README.md).

```bash
cd editor && npm install && npm run dev
```

Dettagli e funzionalità: [`editor/README.md`](editor/README.md).

## 🎵 Creare un canzoniere personalizzato

Per generare un canzoniere PDF (solo testo) da una lista di canzoni c'è il tool Go in [`printer/`](printer/README.md).

```bash
cd printer && go build -o printer . && cd ..
./printer/printer -input=canzonieri/mio_evento.txt -output=canzonieri/mio_evento.pdf
```

Formato della lista, opzioni e dettagli: [`printer/README.md`](printer/README.md).
