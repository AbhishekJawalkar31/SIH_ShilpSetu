# ShilpSetu Backend API Contract

Base URL:

```text
http://localhost:8000/api
```

## Core artisan flow

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Backend health |
| POST | `/catalogue/generate` | Generate catalogue data from an image and optional voice text |
| POST | `/speech/transcribe` | Convert uploaded audio to text with Sarvam Saaras |
| POST | `/translation` | Translate text through Sarvam Translate |
| POST | `/products` | Create an artisan product |
| GET | `/products/{product_id}` | Read one product |
| GET | `/products` | List and filter products |
| PUT | `/products/{product_id}/inventory` | Update stock and production capacity |
| POST | `/products/{product_id}/image` | Store a product image |
| POST | `/products/{product_id}/embedding` | Generate a product embedding |
| GET | `/artisans/{artisan_id}` | Read an artisan profile |
| GET | `/artisans/{artisan_id}/products` | Read an artisan's products |

## Buyer and marketplace flow

| Method | Route | Purpose |
|---|---|---|
| POST | `/search` | Natural-language product search |
| POST | `/matching/bulk` | Match a bulk requirement across artisans |
| POST | `/quotes` | Create a quote request |
| POST | `/quotes/{quote_id}/match` | Match a quote request to artisans |
| POST | `/conversations` | Create a buyer-artisan conversation |
| GET | `/conversations/{conversation_id}` | Read a conversation |
| POST | `/conversations/{conversation_id}/messages` | Send a message |
| GET | `/conversations/{conversation_id}/messages` | List messages |
| POST | `/notifications/send` | Send an SMS, WhatsApp, or push notification |
| POST | `/pricing/train` | Train the market price model |
| POST | `/pricing/recommend` | Get a price recommendation |
| GET | `/auth/me` | Validate the current JWT and read the user |

## Response and error format

Successful endpoints return the documented object directly. Errors use:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product was not found."
  }
}
```

## Regional translation

Request:

```json
{
  "text": "Handwoven jute bag",
  "source_language": "en",
  "target_language": "hi"
}
```

Response:

```json
{
  "text": "हाथ से बुना हुआ जूट का बैग",
  "source_language": "en",
  "target_language": "hi",
  "provider": "sarvam"
}
```

The service accepts short language codes and normalizes them into Sarvam
regional codes such as `en-IN` and `hi-IN`. It supports automatic source
language detection with `"source_language": "auto"`.

## Upload limits

The defaults are:

- Catalogue/product images: 10 MB
- Speech audio: 15 MB

Override them through `MAX_IMAGE_UPLOAD_BYTES` and
`MAX_AUDIO_UPLOAD_BYTES`.