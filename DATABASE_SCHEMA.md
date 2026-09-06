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
