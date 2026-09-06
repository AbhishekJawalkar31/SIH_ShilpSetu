# ShilpSetu — System Architecture

## 1. Project Overview

ShilpSetu is an AI-driven market linkage and smart cataloguing platform for marginalized artisans.

The MVP has two primary experiences:

1. **Artisan**
   - Upload product image
   - Optional voice/text input
   - AI-assisted catalogue generation
   - Competitive price recommendation
   - Publish products
   - Manage availability/capacity

2. **Buyer**
   - Browse products
   - Natural-language/intent search
   - Submit bulk requirements
   - Find a pool of capable artisans
   - Request quotations

---

## 2. Frozen MVP Architecture

```text
                         SHILPSETU
                             |
              +--------------+--------------+
              |                             |
              v                             v
        ARTISAN UI                      BUYER UI
       React / Next.js                React / Next.js
              |                             |
              +--------------+--------------+
                             |
                             v
                       FASTAPI BACKEND
                             |
          +------------------+------------------+
          |                  |                  |
          v                  v                  v
      CATALOGUE         SEARCH & MATCHING    QUOTES
       SERVICE              SERVICE          SERVICE
          |                  |                  |
          +------------------+------------------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
        SUPABASE                         EXTERNAL AI
              |                             |
       +------+------+                  +---+------+
       |      |     |                  |          |
       v      v     v                  v          v
   PostgreSQL pgvector Storage       Gemini     Sarvam
```

### Technology decisions

| Layer | MVP choice |
|---|---|
| Source control | GitHub |
| AI coding/development | OpenAI Codex |
| Frontend | React / Next.js |
| Backend | FastAPI / Python |
| Database | Supabase PostgreSQL |
| Vector search | pgvector |
| Image storage | Supabase Storage |
| Image/catalogue AI | Gemini multimodal |
| Voice-to-text | Sarvam Saaras |
| Semantic embeddings | Selected embedding model compatible with pgvector |
| Deployment | To be finalized |

**Replit is not part of the development workflow or application architecture.**

---

## 3. Repository Responsibilities

```text
shilpsetu/
├── frontend/
│   ├── artisan/
│   └── buyer/
├── backend/
├── ai/
├── database/
├── data/
├── README.md
├── ARCHITECTURE.md
├── API_CONTRACT.md
├── DATABASE_SCHEMA.md
└── CONTRIBUTING.md
```

These documentation files are the shared source of truth.

---

## 4. Artisan Catalogue Flow

```text
Product Image + Optional Voice/Text
                |
                v
             FastAPI
                |
        Voice input present?
             /                  yes        no
            |          |
            v          |
     Sarvam Saaras     |
       Speech → Text   |
            |          |
            +-----+----+
                  |
                  v
          Gemini Multimodal
                  |
                  v
        Structured Catalogue
                  |
       +----------+----------+
       |          |          |
     Title     Category    Attributes
     Desc.      Material      Tags
                  |
                  v
          Pricing Engine
                  |
                  v
      Recommended Price Range
                  |
                  v
       Artisan reviews/edits
                  |
                  v
       PostgreSQL + Storage
```

### Price rule

AI **recommends** a competitive price/range. It does not set the final price.

The artisan always controls the final listed price.

---

## 5. Buyer Search and B2B Matching

Example:

> "I need 100 handmade jute bags for my hotel under ₹700 each."

```text
Buyer Query
    |
    v
FastAPI
    |
    v
Intent Extraction
    |
    +--> product
    +--> quantity
    +--> budget
    +--> use case
    +--> other constraints
    |
    v
Embedding
    |
    v
pgvector semantic retrieval
    |
    v
Candidate products/artisans
    |
    v
Capacity + availability + budget filters
    |
    v
Ranking
    |
    v
Artisan pool
    |
    v
Request Quote
```

The system may combine multiple artisans for a bulk requirement.

Example:

```text
Requirement: 100 bags

Artisan A: 40
Artisan B: 35
Artisan C: 25

Combined capacity: 100
```

---

## 6. Search and Ranking

Semantic retrieval should use product meaning rather than exact keyword matching.

Searchable product information:

- title
- description
- category
- material
- craft type
- tags
- relevant attributes

Candidate ranking may consider:

- semantic relevance
- capacity
- availability
- price suitability
- location
- artisan rating

The exact ranking weights belong to application logic and must not be invented independently by individual contributors.

---

## 7. Pricing Architecture

### MVP

Use comparable products and deterministic/statistical logic based on available product attributes.

Possible inputs:

- category
- material
- size/attributes
- comparable prices
- quantity
- available market signals

Output:

```text
Recommended range: ₹550–₹650
Final price: controlled by artisan
```

### Future

After sufficient transaction data exists, the pricing component can be upgraded to a trained regression/gradient-boosting model.

Do not claim that an LLM alone is a market-price prediction model.

---

## 8. Image Handling

Product images are stored in Supabase Storage.

PostgreSQL stores image references/metadata.

```text
Image
  ↓
Supabase Storage
  ↓
image URL
  ↓
products.image_url
```

AI image processing may perform enhancement such as:

- background cleanup
- lighting improvement
- deblurring/denoising

The actual artisan product must remain authentic. Generative replacement of the product itself is not part of the MVP.

---

## 9. Backend Organization

FastAPI is the central backend. Do not create separate microservices for every AI component during the MVP.

Suggested structure:

```text
backend/
└── app/
    ├── main.py
    ├── api/
    ├── models/
    ├── schemas/
    ├── services/
    │   ├── catalogue/
    │   ├── search/
    │   ├── matching/
    │   ├── pricing/
    │   └── quotes/
    ├── db/
    └── core/
```

---

## 10. MVP Scope

### Must work

- Artisan mobile-first UI
- Product image upload
- Voice/text input
- AI catalogue generation
- Price recommendation
- Product storage/database
- Product publishing
- Buyer marketplace
- Natural-language search
- Semantic search
- Artisan capacity
- B2B artisan-pool matching
- Request Quote

### Nice to have

- Full multilingual UI
- Reviews
- Chat
- Notifications
- Analytics

### Explicitly out of scope for the 2-day MVP

- Payment gateway
- Production billing/subscription collection
- Real WhatsApp/SMS integration
- Large-scale model training
- Kubernetes/microservice infrastructure
- Native Flutter APK
- AR/3D product features

The subscription revenue model remains a **business-model decision**, but payment/billing implementation is not required for the MVP.

---

## 11. Architecture Rules

1. PostgreSQL is the source of truth for structured application data.
2. Supabase Storage is used for product images.
3. pgvector is used for semantic search.
4. FastAPI is the central backend API.
5. Frontend/backend communication follows `API_CONTRACT.md`.
6. AI outputs must follow the defined schemas/contracts.
7. AI recommends prices; artisans control final prices.
8. Bulk requirements support multiple-artisan matching.
9. Do not introduce another database or vector database without explicit approval.
10. Do not replace a frozen technology without approval from the integration owner.
11. Do not create unnecessary microservices for the MVP.
12. Shared contracts must not be changed casually.
13. If a shared contract must change, update the relevant documentation before dependent code is merged.



# ShilpSetu — Database Schema

## 1. Database

- **Database:** PostgreSQL
- **Provider:** Supabase
- **Vector extension:** pgvector
- **Media storage:** Supabase Storage

PostgreSQL is the source of truth for structured application data.

Large media files are stored in Supabase Storage. PostgreSQL stores their references/metadata.

---

## 2. MVP Entity Overview

```text
users
  |
  +---- artisans
  |       |
  |       +---- products ---- inventory
  |       |        |
  |       |        +---- product_embeddings
  |       |
  |       +---- reviews
  |
  +---- quote_requests ---- quote_request_artisans ---- artisans
  |
  +---- orders
```

---

## 3. `users`

Common account information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| name | TEXT | NOT NULL |
| email | TEXT | UNIQUE, nullable |
| phone | TEXT | UNIQUE, nullable |
| role | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Allowed roles:

```text
artisan
buyer
admin
```

---

## 4. `artisans`

Artisan profile and capacity-related information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE |
| business_name | TEXT | |
| craft_type | TEXT | |
| description | TEXT | |
| location | TEXT | |
| city | TEXT | |
| state | TEXT | |
| country | TEXT | DEFAULT 'India' |
| languages | TEXT[] | |
| rating | NUMERIC(3,2) | DEFAULT 0 |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

---

## 5. `products`

Published/draft catalogue information.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| artisan_id | UUID | FK → artisans.id |
| title | TEXT | NOT NULL |
| description | TEXT | NOT NULL |
| category | TEXT | |
| material | TEXT | |
| craft_type | TEXT | |
| tags | TEXT[] | |
| attributes | JSONB | |
| price | NUMERIC(12,2) | |
| currency | TEXT | DEFAULT 'INR' |
| image_url | TEXT | |
| status | TEXT | DEFAULT 'draft' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Allowed status:

```text
draft
published
archived
```

Example `attributes`:

```json
{
  "color": "natural brown",
  "size": "medium",
  "dimensions": "30x20 cm",
  "weight": "150 g"
}
```

The `price` column is the artisan's **final listed price**, not the AI recommendation.

---

## 6. `inventory`

Availability and production capacity.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK → products.id, UNIQUE |
| available_quantity | INTEGER | DEFAULT 0 |
| production_capacity | INTEGER | DEFAULT 0 |
| unit | TEXT | DEFAULT 'piece' |
| updated_at | TIMESTAMPTZ | NOT NULL |

Meaning:

- `available_quantity`: quantity available now.
- `production_capacity`: additional quantity the artisan can reasonably produce/provide for bulk requirements.

For matching purposes, these can be considered together when appropriate, but the application must not assume production capacity is immediately available inventory.

---

## 7. `product_embeddings`

Semantic-search vectors.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| product_id | UUID | FK → products.id, UNIQUE |
| embedding | VECTOR | NOT NULL |
| embedding_model | TEXT | NOT NULL |
| source_text | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL |

`embedding` dimension must match the selected embedding model.

`source_text` records the normalized searchable text used to create the vector, making regeneration/debugging easier.

Recommended source fields:

- title
- description
- category
- material
- craft_type
- tags
- relevant attributes

---

## 8. `quote_requests`

Buyer requirements.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| buyer_id | UUID | FK → users.id |
| product_id | UUID | FK → products.id, nullable |
| quantity | INTEGER | NOT NULL |
| budget_per_unit | NUMERIC(12,2) | nullable |
| total_budget | NUMERIC(12,2) | nullable |
| requirement_text | TEXT | NOT NULL |
| status | TEXT | DEFAULT 'pending' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Allowed status:

```text
pending
responded
accepted
rejected
closed
```

`requirement_text` preserves the original buyer request.

---

## 9. `quote_request_artisans`

Candidate artisans selected for a bulk requirement.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| quote_request_id | UUID | FK → quote_requests.id |
| artisan_id | UUID | FK → artisans.id |
| matched_quantity | INTEGER | |
| match_score | NUMERIC(6,4) | |
| status | TEXT | DEFAULT 'matched' |
| created_at | TIMESTAMPTZ | NOT NULL |

Allowed status:

```text
matched
contacted
quoted
accepted
rejected
```

This table allows one buyer requirement to be matched to multiple artisans.

---

## 10. `reviews`

Buyer reviews.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| buyer_id | UUID | FK → users.id |
| artisan_id | UUID | FK → artisans.id |
| product_id | UUID | FK → products.id |
| rating | INTEGER | CHECK 1–5 |
| comment | TEXT | |
| created_at | TIMESTAMPTZ | NOT NULL |

Reviews are optional for the 2-day MVP.

---

## 11. `orders`

Finalized purchase records.

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| buyer_id | UUID | FK → users.id |
| artisan_id | UUID | FK → artisans.id |
| product_id | UUID | FK → products.id |
| quantity | INTEGER | NOT NULL |
| unit_price | NUMERIC(12,2) | NOT NULL |
| total_price | NUMERIC(12,2) | NOT NULL |
| status | TEXT | DEFAULT 'pending' |
| created_at | TIMESTAMPTZ | NOT NULL |
| updated_at | TIMESTAMPTZ | NOT NULL |

Allowed status:

```text
pending
confirmed
processing
completed
cancelled
```

Payment processing is outside the MVP.

---

## 12. AI Price Recommendation

Do **not** add an `ai_price` field to `products` for the MVP unless the implementation explicitly needs historical recommendation storage.

The final `products.price` is the artisan-controlled price.

If recommendation history is required later, create a separate table such as:

```text
price_recommendations
```

rather than mixing AI recommendations with the final selling price.

---

## 13. Product Images

Images are stored in Supabase Storage.

Database:

```text
products.image_url
```

Storage:

```text
Supabase Storage bucket
    └── product images
```

Do not store product images as PostgreSQL binary data for the MVP.

---

## 14. Search and Matching Data

Semantic search uses:

```text
products.title
products.description
products.category
products.material
products.craft_type
products.tags
products.attributes
```

Search flow:

```text
Buyer query
   ↓
Intent extraction
   ↓
Embedding
   ↓
pgvector retrieval
   ↓
Capacity / availability / budget filtering
   ↓
Ranking
   ↓
Artisan pool
```

Possible ranking signals:

- semantic relevance
- capacity
- availability
- price suitability
- location
- rating

Ranking weights belong to application logic, not the schema.

---

## 15. Capacity Example

For:

```text
Buyer requirement = 100 units
```

Possible candidates:

```text
Artisan A → 40
Artisan B → 35
Artisan C → 25
```

The matching layer can create:

```text
quote_request_artisans

A → matched_quantity = 40
B → matched_quantity = 35
C → matched_quantity = 25
```

Total:

```text
100 units
```

---

## 16. Revenue Model

The ShilpSetu business model is subscription-based rather than marketplace commission-based.

However, the **MVP does not implement subscription billing or payment collection**.

Therefore these tables are intentionally excluded from the MVP schema:

```text
subscriptions
payments
invoices
transactions
```

They can be introduced in a future production billing module.

---

## 17. Required Constraints

At minimum:

- UUID primary keys for major entities
- Foreign keys for relationships
- `TIMESTAMPTZ` for timestamps
- `JSONB` for flexible product attributes
- `TEXT[]` for tags/languages where appropriate
- `NUMERIC(12,2)` for monetary values
- Rating constrained to 1–5
- Quantities must not be negative
- Product price must not be negative
- Unique product → embedding relationship in MVP
- Unique product → inventory relationship in MVP
- Unique artisan → user relationship in MVP

---

## 18. Migration Rules

All schema changes must be implemented through database migrations.

Do not make undocumented manual schema changes in the shared database.

When a schema change is required:

1. Update `DATABASE_SCHEMA.md`.
2. Update affected API contracts.
3. Create/update the migration.
4. Update dependent code.
5. Test the affected flow.
6. Merge only after the integration owner verifies compatibility.

---

## 19. Schema Ownership Rules

1. This document is the canonical MVP schema.
2. Contributors must not independently redesign shared tables.
3. Do not rename columns casually.
4. Do not duplicate existing fields for convenience.
5. Do not introduce another database/vector database without approval.
6. If a feature needs new data, propose the smallest schema change required.
7. Any accepted schema change must be reflected in this document before dependent code is merged.



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
