# ShilpSetu — Database Management & Setup Guide

This directory contains the canonical PostgreSQL schema, migrations, storage setup, seed data, and integration tooling for the ShilpSetu MVP, built for **Supabase PostgreSQL** with the **`pgvector`** extension.

---

## 1. Directory Structure

```text
database/
├── README.md                          # Database setup & execution guide
├── migrations/
│   ├── 001_initial_schema.sql         # 9 MVP tables, constraints, pgvector, triggers, indexes
│   └── 002_storage_setup.sql          # Supabase Storage bucket 'product-images' & policies
├── seeds/
│   ├── 001_seed_data.sql              # Realistic seed data (Hero 100-jute-bag matching scenario)
│   └── 002_prototype_dataset.sql      # Prototype dataset migration (23 users, 20 artisans, 150 products)
└── scripts/
    ├── verify_schema.py               # Automated validator for schema constraints & seed integrity
    └── test_integration.py           # Cross-module integration test suite (AI, Frontend, Search, DB)
```

---

## 2. Cross-Module Integration Architecture

The database layer serves as the central data contract connecting all other modules:

```text
       ┌────────────────────────┐
       │   ARTISAN UI (Next.js) │
       └───────────┬────────────┘
                   │ 1. Upload photo & speech
                   ▼
       ┌────────────────────────┐
       │     FASTAPI BACKEND    │
       └─────┬────────────┬─────┘
             │            │
2. Gemini &  │            │ 3. Save catalogue & price
   Sarvam AI │            ▼
             │  ┌────────────────────────┐
             └─►│  SUPABASE POSTGRESQL   │
                │  - products            │
                │  - inventory           │
                │  - product_embeddings  │
                └───────────┬────────────┘
                            ▲
                            │ 4. Vector semantic search
                            │    & capacity matching
       ┌────────────────────┴───┐
       │  BUYER UI / SEARCH     │
       │  - POST /api/search    │
       │  - B2B Matching Pool   │
       └────────────────────────┘
```

1. **AI Catalogue Integration:**
   - Gemini outputs structured JSON matching [`CatalogueGenerationResponse`](../backend/app/schemas/catalogue.py).
   - The fields (`title`, `description`, `category`, `material`, `craft_type`, `tags`, `attributes`) map directly 1:1 into the `products` table.
   - The artisan selects the final listed price (`products.price`) based on `recommended_price_min`/`max`.
2. **Media Storage Integration:**
   - Product images are uploaded to the Supabase Storage bucket `product-images`.
   - `products.image_url` stores the public CDN URL reference.
3. **Semantic Search & Vector Embeddings:**
   - The database defines `product_embeddings` with `vector(768)` and an HNSW cosine similarity index.
   - Demo seed data assumes `gemini-embedding-2` configured to 768-dimensional output.
   - **Cross-Module Dependency:** Actual embedding generation and retrieval algorithms are owned by `search-matching`, not the database branch. The `search-matching` service must request/use 768-dimensional output from `gemini-embedding-2` to remain compatible with this schema.
4. **B2B Multi-Artisan Pool Matching:**
   - When a buyer submits a bulk requirement (e.g. 100 jute bags), candidate artisans are pooled to satisfy the requested capacity.
   - The allocation is recorded in `quote_requests` and `quote_request_artisans`.
5. **Auth Identity Mapping:**
   - Adheres to `API_CONTRACT.md` Section 23: authenticated Supabase Auth user IDs map directly to `users.id` and `artisans.user_id`.

---

## 3. How to Apply to Supabase

### Method A: Supabase Web Dashboard (Recommended)

1. Open your project on the [Supabase Dashboard](https://app.supabase.com).
2. Navigate to the **SQL Editor** from the left navigation panel.
3. Execute the migrations in order:
   - **Step 1:** Run [`migrations/001_initial_schema.sql`](migrations/001_initial_schema.sql) (Creates extensions, 9 MVP tables, indexes, triggers).
   - **Step 2:** Run [`migrations/002_storage_setup.sql`](migrations/002_storage_setup.sql) (Configures `product-images` storage bucket and access policies).
   - **Step 3 (Demo):** Run [`seeds/001_seed_data.sql`](seeds/001_seed_data.sql) (Loads initial demo seed data, hero B2B scenario, and embeddings non-destructively).
   - **Step 4 (Prototype Dataset):** Run [`seeds/002_prototype_dataset.sql`](seeds/002_prototype_dataset.sql) (Loads the complete prototype dataset: 23 users, 20 artisans, 150 products, 150 inventory rows, 2 quote requests, and 5 multi-artisan pool allocations).

### Method B: CLI / `psql`

```bash
# Apply schema migrations
psql "$DATABASE_URL" -f database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f database/migrations/002_storage_setup.sql

# Load demo seed data (idempotent, non-destructive)
psql "$DATABASE_URL" -f database/seeds/001_seed_data.sql

# Load prototype dataset (idempotent, non-destructive)
psql "$DATABASE_URL" -f database/seeds/002_prototype_dataset.sql
```

---

## 4. How to Test Everything

We have provided two automated test suites:

### Test 1: Schema & Seed Data Validation
Validates that table schemas, column types, constraints, UUIDs, foreign keys, the hero scenario, and the prototype dataset are 100% compliant with documentation:

```bash
python database/scripts/verify_schema.py
```

Expected output:
```text
=================================================================
ShilpSetu Database Verification
=================================================================

--- 1. Migration Sequence & File Order Validation ---
[PASS] Migrations are strictly ordered, unique, and free of duplicate/conflicting files.
  - Verified migration: 001_initial_schema.sql
  - Verified migration: 002_storage_setup.sql

--- 2. Schema Migration Validation (001_initial_schema.sql) ---
[PASS] Schema matches DATABASE_SCHEMA.md constraints, extensions, and tables.
  - Verified 9 MVP tables: users, artisans, products, inventory, product_embeddings, quote_requests, quote_request_artisans, reviews, orders
  - Verified absence of prohibited tables: subscriptions, payments, invoices, transactions, whatsapp, sms
  - Verified 768-dim pgvector column and HNSW cosine similarity index.
  - Verified all foreign keys, status checks, and updated_at triggers.

--- 3. Seed Data Validation (001_seed_data.sql) ---
[PASS] Seed data referential integrity and UUID validation passed.
  Entity Counts in Seed Data:
    * users: 10
    * artisans: 7
    * products: 10
    * inventory: 10
    * product_embeddings: 10
    * quote_requests: 2
    * quote_request_artisans: 3
    * reviews: 2
    * orders: 2
    * hero_matched_units: 100
  - Verified Hero B2B Jute Pool: 40 + 35 + 25 = 100 units.
  - Verified Frontend Mock Artisan Profile ID integration.

--- 4. Prototype Dataset Migration Validation (002_prototype_dataset.sql) ---
[PASS] Prototype dataset referential integrity and constraints passed.
  Entity Counts in Prototype Dataset:
    * users: 23
    * artisans: 20
    * products: 150
    * inventory: 150
    * quote_requests: 2
    * quote_request_artisans: 5
    * quote_1_matched_units: 100
    * quote_2_matched_units: 60
  - Verified Quote 1 Multi-Artisan Pool: 37 + 39 + 24 = 100 units.
  - Verified Quote 2 Multi-Artisan Pool: 39 + 21 = 60 units.

=================================================================
RESULT: ALL DATABASE CHECKS PASSED SUCCESSFULLY (100% compliant)
=================================================================
```

### Test 2: Cross-Module Integration Contract Test
Simulates end-to-end data flows from AI Catalogue, Artisan Frontend, Search Schema Contracts, and B2B Bulk Matching:

```bash
python database/scripts/test_integration.py
```

Expected output:
```text
=================================================================
ShilpSetu Cross-Module Database Integration Test Suite
=================================================================
Testing 1: AI Catalogue (Gemini) -> Database Products schema...
  [PASS] AI Catalogue output directly translates to Database Product row.
Testing 2: Speech (Sarvam Saaras) -> Catalogue generator input...
  [PASS] Speech transcription contract verified.
Testing 3: Artisan Frontend (Next.js) -> Database Product & Inventory...
  [PASS] Frontend payload maps cleanly to products and inventory tables.
Testing 4: B2B Multi-Artisan Pool Matching (Hero Scenario)...
  [PASS] B2B Pool matching formed successfully: 100 units across 3 artisans.
Testing 5: Search & Matching Schema Contract (DATABASE_SCHEMA.md Section 14)...
  [PASS] Database schema exposes all required searchable, ranking, and capacity fields.
Testing 6: Auth Identity Mapping Contract (API_CONTRACT.md Section 23)...
  [PASS] users and artisans schema adheres to API_CONTRACT.md Section 23 auth identity mapping.

Testing 7: Live Supabase Database Connection...
  DATABASE_URL not set in local environment (Offline test mode).
  [INFO] Offline contract verification completed with 100% compliance.

=================================================================
RESULT: ALL INTEGRATION CONTRACTS PASSED (READY FOR INTEGRATION)
=================================================================
```
