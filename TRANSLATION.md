# Regional translation

`POST /api/translation` is the backend translation boundary for the artisan
frontend.

## Request

```json
{
  "text": "Handwoven jute bag",
  "source_language": "en",
  "target_language": "hi"
}
```

The source can be `auto` or a short Sarvam language code. The target must be a
Sarvam-supported Indian language. Short values are normalized internally:
`hi` becomes `hi-IN`, `ta` becomes `ta-IN`, and so on.

## Response

```json
{
  "text": "हाथ से बुना हुआ जूट का बैग",
  "source_language": "en",
  "target_language": "hi",
  "provider": "sarvam"
}
```

The response preserves the language values supplied by the caller for
frontend compatibility. Only the upstream request uses canonical regional
codes.

## Configuration

```env
SARVAM_API_KEY=replace-with-a-secret
SARVAM_API_BASE_URL=https://api.sarvam.ai
SARVAM_TRANSLATION_MODEL=sarvam-translate:v1
SARVAM_TRANSLATION_MODE=formal
SARVAM_TRANSLATION_TIMEOUT_SECONDS=20
```

The API key must be stored in the deployment secret manager, not committed to
`.env` or source control. Sarvam uses the `api-subscription-key` header.

`sarvam-translate:v1` supports the full regional language set and accepts up
to 2,000 characters per request. The service chunks longer text at sentence
or word boundaries. A configured `mayura:v1` model is automatically limited
to 1,000 characters per upstream request.