# Backend

Servizio HTTP in Go che fa da proxy fidato verso le API di GitHub: il sito
pubblico può proporre modifiche alle canzoni e inviare suggerimenti senza che
alcun token GitHub raggiunga il browser.

## Endpoint

| Metodo | Path               | Effetto                                                    |
| ------ | ------------------ | ---------------------------------------------------------- |
| `GET`  | `/health`          | Health check                                               |
| `POST` | `/api/songs`       | Crea branch + commit + pull request con la canzone inviata |
| `POST` | `/api/suggestions` | Apre una issue sul repository con il suggerimento          |

### `POST /api/songs`

```json
{
  "path": "canzoni/branco/attorno_alla_rupe.cho",
  "content": "{title:Attorno alla Rupe}\n...",
  "note": "Corretti gli accordi del ritornello",
  "author": "Mario",
  "turnstileToken": "..."
}
```

Risposta `201`: `{"pullRequestUrl": "https://github.com/..."}`.

Il `path` deve corrispondere a `canzoni/<categoria>/<file>.cho` (minuscole,
underscore); il contenuto deve essere UTF-8 valido con la direttiva
`{title:...}`. La modifica non tocca mai `main`: finisce in una pull request
da revisionare.

### `POST /api/suggestions`

```json
{
  "message": "Manca la strofa finale di ...",
  "song": "Attorno alla Rupe",
  "name": "Mario",
  "turnstileToken": "..."
}
```

Risposta `201`: `{"issueUrl": "https://github.com/..."}`.

## Configurazione (variabili d'ambiente)

| Variabile            | Default                       | Uso                                       |
| -------------------- | ----------------------------- | ----------------------------------------- |
| `GITHUB_TOKEN`       | (obbligatoria)                | Fine-grained PAT, solo questo repo        |
| `GITHUB_REPO`        | `lussoluca/canzoniere`        | Repository di destinazione                |
| `GITHUB_BASE_BRANCH` | `main`                        | Branch base delle pull request            |
| `TURNSTILE_SECRET`   | (vuota = verifica disattiva)  | Secret di Cloudflare Turnstile            |
| `ALLOWED_ORIGINS`    | `https://lussoluca.github.io` | Origin CORS ammessi, separati da virgola  |
| `PORT`               | `8080`                        | Porta di ascolto (impostata da Cloud Run) |

Il token GitHub va creato come fine-grained PAT limitato al repository
`lussoluca/canzoniere` con i permessi repository `Contents: Read and write`,
`Pull requests: Read and write` e `Issues: Read and write`.

Anti-abuso: rate limiting in memoria (10 POST al minuto per IP) e, quando
`TURNSTILE_SECRET` è impostata, verifica server-side del token Cloudflare
Turnstile inviato dal client nel campo `turnstileToken`.

## Sviluppo locale

```sh
cd backend
GITHUB_TOKEN=... go run .
go test ./...
```

## Deploy su Cloud Run

Progetto GCP: `canzoniere-506115` (account `lussoluca@gmail.com`).

Prima volta:

```sh
gcloud auth login
gcloud config set project canzoniere-506115
gcloud services enable run.googleapis.com secretmanager.googleapis.com \
  cloudbuild.googleapis.com artifactregistry.googleapis.com

# Token GitHub in Secret Manager (incolla il PAT, poi Ctrl-D)
gcloud secrets create github-token --data-file=-
# Secret di Turnstile (facoltativo ma consigliato in produzione)
gcloud secrets create turnstile-secret --data-file=-
```

Deploy (da `backend/`):

```sh
gcloud run deploy canzoniere-api \
  --source . \
  --region europe-west1 \
  --allow-unauthenticated \
  --min-instances 0 --max-instances 1 \
  --memory 128Mi \
  --set-secrets GITHUB_TOKEN=github-token:latest,TURNSTILE_SECRET=turnstile-secret:latest
```

Con `--min-instances 0` il servizio scala a zero: al volume atteso resta nel
tier gratuito di Cloud Run. Il primo avvio dopo un periodo di inattività
aggiunge circa un secondo di latenza.
