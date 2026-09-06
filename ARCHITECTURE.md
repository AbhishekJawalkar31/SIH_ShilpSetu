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



