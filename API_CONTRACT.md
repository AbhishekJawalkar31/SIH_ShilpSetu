# ShilpSetu — API Contract

## 1. Purpose

This document defines the shared contract between:

- Artisan frontend
- Buyer frontend
- FastAPI backend
- AI catalogue services
- Search and matching services
- Database layer

**This is a shared interface. Do not independently rename fields, endpoints, request properties, or response properties.**

If a contract must change, update this document first and coordinate with the integration owner.

---

# 2. API Conventions

Base path:

```text
/api
```

Content type:

```text
application/json
```

For image upload endpoints, `multipart/form-data` may be used.

IDs:

```text
UUID strings
```

Money:

```text
JSON number
```

Currency:

```text
INR
```

Timestamps:

```text
ISO 8601 / UTC
```

Example:

```text
2026-09-06T10:30:00Z
```

---

# 3. Standard Success Response

Endpoints should return the documented response object directly unless an endpoint explicitly defines another wrapper.

Example:

```json
{
  "id": "uuid",
  "title": "Handmade Jute Bag"
}
```

Do not create arbitrary response wrappers such as:

```json
{
  "success": true,
  "data": {}
}
```

unless the endpoint contract explicitly requires them.

---

# 4. Standard Error Response

All API errors should use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Example:

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Product was not found."
  }
}
```

Common HTTP status codes:

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 400 | Invalid request |
| 401 | Authentication required/invalid |
| 403 | Not authorized |
| 404 | Resource not found |
| 409 | Conflict |
| 422 | Validation error |
| 500 | Internal server error |

---

# 5. Health Check

## `GET /api/health`

Used to verify that the backend is running.

### Response

```json
{
  "status": "ok"
}
```

---

# 6. Catalogue Generation

## `POST /api/catalogue/generate`

Generates an AI-assisted product catalogue from an image and optional voice/text input.

### Input

For the MVP, use `multipart/form-data`.

Fields:

| Field | Type | Required |
|---|---|---|
| image | file | Yes |
| voice_text | string | No |
| artisan_id | UUID | Yes |

`voice_text` is the already-transcribed text when voice input has been processed by Sarvam.

The backend may also expose a separate speech endpoint if the implementation requires direct audio upload.

### Example logical input

```text
image:
product.jpg

voice_text:
"This is a handwoven jute bag suitable for hotels and gifting."

artisan_id:
uuid
```

### Response

```json
{
  "title": "Handwoven Jute Bag",
  "description": "Eco-friendly handwoven jute bag suitable for hotels, events and gifting.",
  "category": "Bags",
  "material": "Jute",
  "craft_type": "Handwoven",
  "tags": [
    "handmade",
    "eco-friendly",
    "jute",
    "bulk",
    "gifting"
  ],
  "attributes": {
    "color": "natural brown",
    "size": "medium"
  },
  "recommended_price_min": 550,
  "recommended_price_max": 650
}
```

### Important

The generated price fields are recommendations only.

The artisan chooses the final `products.price`.

---

# 7. Speech-to-Text

## `POST /api/speech/transcribe`

Converts artisan voice input into text.

Sarvam Saaras is the preferred MVP speech-to-text service.

### Input

`multipart/form-data`

```text
audio: audio file
language: optional language code
```

### Response

```json
{
  "text": "This is a handwoven jute bag for hotel gifting.",
  "language": "hi"
}
```

The exact language-code format must be standardized by the backend implementation.

---

# 8. Create Product

## `POST /api/products`

Creates a product after the artisan reviews the generated catalogue.

### Request

```json
{
  "artisan_id": "uuid",
  "title": "Handwoven Jute Bag",
  "description": "Eco-friendly handwoven jute bag suitable for hotels and gifting.",
  "category": "Bags",
  "material": "Jute",
  "craft_type": "Handwoven",
  "tags": [
    "handmade",
    "eco-friendly",
    "jute"
  ],
  "attributes": {
    "color": "natural brown",
    "size": "medium"
  },
  "price": 620,
  "currency": "INR",
  "image_url": "https://storage.example/product.jpg",
  "status": "published"
}
```

### Response

```json
{
  "id": "uuid",
  "artisan_id": "uuid",
  "title": "Handwoven Jute Bag",
  "description": "Eco-friendly handwoven jute bag suitable for hotels and gifting.",
  "category": "Bags",
  "material": "Jute",
  "craft_type": "Handwoven",
  "tags": [
    "handmade",
    "eco-friendly",
    "jute"
  ],
  "attributes": {
    "color": "natural brown",
    "size": "medium"
  },
  "price": 620,
  "currency": "INR",
  "image_url": "https://storage.example/product.jpg",
  "status": "published",
  "created_at": "2026-09-06T10:30:00Z",
  "updated_at": "2026-09-06T10:30:00Z"
}
```

---

# 9. Get Product

## `GET /api/products/{product_id}`

Returns one product.

### Response

```json
{
  "id": "uuid",
  "artisan_id": "uuid",
  "title": "Handwoven Jute Bag",
  "description": "Eco-friendly handwoven jute bag suitable for hotels and gifting.",
  "category": "Bags",
  "material": "Jute",
  "craft_type": "Handwoven",
  "tags": [
    "handmade",
    "eco-friendly",
    "jute"
  ],
  "attributes": {},
  "price": 620,
  "currency": "INR",
  "image_url": "https://storage.example/product.jpg",
  "status": "published"
}
```

---

# 10. List Products

## `GET /api/products`

Used by the buyer marketplace.

### Optional query parameters

```text
category
artisan_id
min_price
max_price
status
limit
offset
```

Example:

```text
GET /api/products?category=Bags&max_price=700&status=published
```

### Response

```json
{
  "products": [
    {
      "id": "uuid",
      "artisan_id": "uuid",
      "title": "Handwoven Jute Bag",
      "description": "Eco-friendly handwoven jute bag.",
      "category": "Bags",
      "material": "Jute",
      "price": 620,
      "currency": "INR",
      "image_url": "https://storage.example/product.jpg"
    }
  ],
  "total": 1
}
```

---

# 11. Update Inventory / Capacity

## `PUT /api/products/{product_id}/inventory`

Updates current availability and production capacity.

### Request

```json
{
  "available_quantity": 20,
  "production_capacity": 50,
  "unit": "piece"
}
```

### Response

```json
{
  "product_id": "uuid",
  "available_quantity": 20,
  "production_capacity": 50,
  "unit": "piece",
  "updated_at": "2026-09-06T10:30:00Z"
}
```

---

# 12. Natural-Language Search

## `POST /api/search`

Searches products using natural-language intent and semantic similarity.

### Request

```json
{
  "query": "I need 100 handmade jute bags for my hotel under 700 rupees each"
}
```

Optional structured constraints may be supplied when already known:

```json
{
  "query": "I need 100 handmade jute bags for my hotel under 700 rupees each",
  "quantity": 100,
  "budget_per_unit": 700,
  "location": null
}
```

### Response

```json
{
  "intent": {
    "product": "handmade jute bags",
    "quantity": 100,
    "budget_per_unit": 700,
    "use_case": "hotel",
    "location": null
  },
  "results": [
    {
      "product_id": "uuid",
      "artisan_id": "uuid",
      "title": "Handwoven Jute Bag",
      "price": 620,
      "available_quantity": 20,
      "production_capacity": 50,
      "match_score": 0.91
    }
  ]
}
```

`match_score` is an application ranking score. It is not a probability.

---

# 13. Artisan Pool Matching

## `POST /api/matching/bulk`

Finds a pool of artisans/products capable of satisfying a bulk requirement.

### Request

```json
{
  "query": "100 handmade jute bags for a hotel",
  "quantity": 100,
  "budget_per_unit": 700,
  "location": null
}
```

### Response

```json
{
  "required_quantity": 100,
  "matched_quantity": 100,
  "artisans": [
    {
      "artisan_id": "uuid",
      "business_name": "Artisan A",
      "product_id": "uuid",
      "matched_quantity": 40,
      "match_score": 0.93
    },
    {
      "artisan_id": "uuid",
      "business_name": "Artisan B",
      "product_id": "uuid",
      "matched_quantity": 35,
      "match_score": 0.89
    },
    {
      "artisan_id": "uuid",
      "business_name": "Artisan C",
      "product_id": "uuid",
      "matched_quantity": 25,
      "match_score": 0.86
    }
  ]
}
```

The matching layer should prioritize relevant products and feasible combined capacity.

---

# 14. Create Quote Request

## `POST /api/quotes`

Creates a buyer request for quotation.

### Request

```json
{
  "buyer_id": "uuid",
  "product_id": "uuid",
  "quantity": 100,
  "budget_per_unit": 700,
  "total_budget": 70000,
  "requirement_text": "I need 100 handmade jute bags for my hotel under ₹700 each."
}
```

`product_id` may be `null` when the request is based on a general natural-language requirement.

### Response

```json
{
  "id": "uuid",
  "buyer_id": "uuid",
  "product_id": "uuid",
  "quantity": 100,
  "budget_per_unit": 700,
  "total_budget": 70000,
  "requirement_text": "I need 100 handmade jute bags for my hotel under ₹700 each.",
  "status": "pending",
  "created_at": "2026-09-06T10:30:00Z"
}
```

---

# 15. Match Quote Request to Artisans

## `POST /api/quotes/{quote_id}/match`

Runs the matching logic for a quote request.

### Response

```json
{
  "quote_request_id": "uuid",
  "required_quantity": 100,
  "matched_quantity": 100,
  "artisans": [
    {
      "artisan_id": "uuid",
      "product_id": "uuid",
      "matched_quantity": 40,
      "match_score": 0.93
    },
    {
      "artisan_id": "uuid",
      "product_id": "uuid",
      "matched_quantity": 35,
      "match_score": 0.89
    },
    {
      "artisan_id": "uuid",
      "product_id": "uuid",
      "matched_quantity": 25,
      "match_score": 0.86
    }
  ]
}
```

---

# 16. Get Artisan Products

## `GET /api/artisans/{artisan_id}/products`

Returns products belonging to an artisan.

### Response

```json
{
  "artisan_id": "uuid",
  "products": []
}
```

---

# 17. Get Artisan Profile

## `GET /api/artisans/{artisan_id}`

### Response

```json
{
  "id": "uuid",
  "business_name": "Example Artisan Collective",
  "craft_type": "Handwoven Crafts",
  "description": "Traditional handmade products.",
  "location": "Jaipur, Rajasthan",
  "city": "Jaipur",
  "state": "Rajasthan",
  "country": "India",
  "languages": ["hi", "en"],
  "rating": 4.7
}
```

---

# 18. API Ownership

| API area | Primary owner |
|---|---|
| Catalogue generation | AI Catalogue + Backend |
| Speech transcription | AI Catalogue + Backend |
| Products | Backend + Database |
| Inventory/capacity | Backend + Database |
| Search | Search/Matching + Backend |
| Bulk matching | Search/Matching + Backend |
| Quotes | Backend |
| Frontend integration | Artisan/Buyer frontend owners |

Ownership does not mean other contributors cannot inspect or use an API. It means the owner is responsible for keeping the implementation aligned with this contract.

---

# 19. Frontend Rules

Frontend contributors must:

1. Use endpoint names exactly as documented.
2. Use request field names exactly as documented.
3. Use response field names exactly as documented.
4. Never hard-code database queries in the frontend.
5. Never call Gemini/Sarvam directly from the frontend when the architecture routes the service through FastAPI.
6. Handle documented loading, success, and error states.
7. Do not invent fallback field names such as `productName` when the contract says `title`.

---

# 20. Backend Rules

Backend contributors must:

1. Implement endpoints according to this document.
2. Validate incoming data.
3. Return documented response structures.
4. Keep database-specific details inside backend/database layers.
5. Keep AI provider keys/secrets on the server side.
6. Do not expose Gemini/Sarvam API keys to the frontend.
7. Update this document before changing a shared contract.

---

# 21. AI Service Rules

AI contributors must:

1. Return structured outputs matching the documented schemas.
2. Validate model-generated JSON before returning it to the backend.
3. Avoid adding undocumented fields as required frontend dependencies.
4. Keep provider-specific implementation details behind backend service interfaces.
5. Treat AI output as untrusted data and validate it.
6. Preserve artisan control over final price.

---

# 22. Search and Matching Rules

Search/matching contributors must:

1. Use the product fields defined in `DATABASE_SCHEMA.md`.
2. Use pgvector for semantic retrieval in the MVP.
3. Apply capacity/availability constraints after candidate retrieval.
4. Support multiple-artisan matching for bulk requirements.
5. Keep ranking logic inside the backend/search layer.
6. Do not introduce another vector database without approval.

---

# 23. Authentication

Authentication is intentionally minimal for the 2-day MVP.

If Supabase Auth is used, the authenticated user's identity should map to `users.id`.

Do not build a separate custom authentication system unless explicitly required.

Authentication implementation details must not change the documented business API contracts.

---

# 24. Contract Change Procedure

A shared API change must follow this sequence:

```text
1. Identify why the change is needed
        ↓
2. Update API_CONTRACT.md
        ↓
3. Update affected backend schemas
        ↓
4. Update affected frontend/AI code
        ↓
5. Test the complete affected flow
        ↓
6. Integrate into main
```

Do not silently change an endpoint or response shape.

---

# 25. MVP API Principle

Keep the API small.

Do not create an endpoint for every internal function.

The goal is a reliable end-to-end MVP:

```text
Artisan
  ↓
Catalogue generation
  ↓
Product creation
  ↓
Searchable product
  ↓
Buyer natural-language search
  ↓
B2B matching
  ↓
Quote request
```

The API should support this demo flow first.
