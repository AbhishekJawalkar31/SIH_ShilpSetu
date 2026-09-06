ShilpSetu Backend
FastAPI backend for the ShilpSetu artisan marketplace. This branch contains
the API layer and backend orchestration used by the artisan frontend:
AI-assisted catalogue generation with Gemini
Sarvam Saaras speech-to-text
Sarvam Translate for Indian regional languages
Product listings, inventory, search, matching, quotes, chat, notifications,
and market-aware price recommendations
In-memory adapters for local development and Supabase REST adapters for
deployed environments
Local setup
```bash
cd ShilpSetu-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
The health check is available at `GET /api/health`.
The complete endpoint list is in `API_CONTRACT.md`.
Sarvam regional translation
Set `SARVAM_API_KEY` in the environment. The backend calls
`POST https://api.sarvam.ai/translate` through `POST /api/translation`.
Short frontend language values such as `hi`, `ta`, and `mr` are normalized to
Sarvam's regional codes (`hi-IN`, `ta-IN`, and `mr-IN`).
Supported language codes include:
```text
as-IN  bn-IN  brx-IN  doi-IN  en-IN  gu-IN  hi-IN  kn-IN
kok-IN ks-IN  mai-IN  ml-IN  mni-IN  mr-IN  ne-IN  od-IN
pa-IN  sa-IN  sat-IN sd-IN  ta-IN  te-IN  ur-IN
```
Example request:
```bash
curl -X POST http://localhost:8000/api/translation \
  -H 'Content-Type: application/json' \
  -d '{"text":"Handwoven jute bag","source_language":"en","target_language":"hi"}'
```
Long text is split at sentence or word boundaries before it is sent to
Sarvam, then reassembled in the original order. If `SARVAM_API_KEY` is not
configured, local development uses an explicit `passthrough-local` response;
production deployments should always configure Sarvam.
Tests
```bash
pytest -q
```
The test suite uses mocked provider clients and does not require API keys.
Frontend contract
The backend keeps the frontend's existing contracts:
`POST /api/catalogue/generate`
`POST /api/speech/transcribe`
`POST /api/products`
`GET /api/artisans/{artisan_id}/products`
`GET /api/artisans/{artisan_id}`
`POST /api/translation`
All API errors use:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```
Never commit `.env` or provider keys.
