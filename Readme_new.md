[README_new.md](https://github.com/user-attachments/files/31912335/README_new.md)
# ShilpSetu — Integration Manual

## 1. Purpose

This document is the practical integration runbook for ShilpSetu.

The goal is to make integration predictable: every contributor should be able to connect their completed module to the main system without rewriting unrelated work.

### ShilpSetu MVP Hero Flow

```text
ARTISAN UI
    │
    │ HTTP/API
    ▼
FASTAPI BACKEND
    ├── AI Catalogue ── Gemini
    ├── Speech ──────── Sarvam
    ├── Search ──────── Gemini + Embeddings
    ├── Matching ────── Capacity Allocation
    ▼
SUPABASE POSTGRESQL + pgvector
    └── Supabase Storage (images)
    ▲
    │
BUYER UI
```

The intended business flow is:

```text
Artisan
  ↓
Upload Image / Give Voice Description
  ↓
AI Catalogue Generation
  ↓
AI Price Recommendation
  ↓
Review / Publish
  ↓
Product Database
  ↓
Buyer Natural-Language Search
  ↓
Semantic Search + Capacity Matching
  ↓
Artisan Pool
  ↓
Request Quote
```

---

# 2. Integration Rules

These rules should be followed during integration.

1. **`main` is the integration source of truth.**
2. Do not rewrite another teammate's module unless integration genuinely requires it.
3. Read the repository documentation before changing shared interfaces.
4. `API_CONTRACT.md` is the source of truth for API request/response contracts.
5. `DATABASE_SCHEMA.md` and database migrations are the source of truth for database structure.
6. Do not hardcode API keys, database passwords, or other secrets.
7. Keep changes as small as possible.
8. Every integration change must be tested.
9. Do not silently change field names or endpoint paths.
10. Frontend code should communicate with the backend through APIs; it should not directly import backend Python code.
11. Database writes must respect foreign keys and the intended insert order.
12. AI-generated output must be validated before being stored.
13. Image source URLs and application storage URLs/paths must not be confused.
14. If implementation and documentation disagree, stop and verify the intended contract before integrating.
15. Never commit `.env` files or secrets.

---

# 3. Before Starting Integration

## 3.1 Required tools

Make sure the machine has:

- Git
- Node.js and npm
- Python
- Supabase access
- A browser for frontend testing

## 3.2 Start from the latest main

```bash
git checkout main
git pull origin main
```

Do not start integration from an outdated local branch.

## 3.3 Understand the repository

The major areas are:

```text
frontend/
    artisan/
    buyer/

backend/
    app/
        api/
        services/
        schemas/
        db/
    tests/

database/
    migrations/
    scripts/
    seeds/

API_CONTRACT.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
CONTRIBUTING.md
README.md
```

Before integration, read:

```text
README.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_CONTRACT.md
CONTRIBUTING.md
```

---

# 4. Environment Configuration

Integration requires the correct environment variables.

Typical configuration includes:

```env
SUPABASE_URL=...
SUPABASE_KEY=...

GEMINI_API_KEY=...

SARVAM_API_KEY=...
```

Use the **actual variable names already defined by the repository code/configuration**. Do not create duplicate names just because they look cleaner.

### Rules

- Keep secrets in `.env` or the approved secret-management mechanism.
- Never put secrets directly in source code.
- Never commit `.env`.
- Confirm that the backend can read the required variables before debugging application logic.
- Confirm that the frontend points to the correct backend URL.

---

# 5. Database Integration

The database is the structured source of truth for application data.

The expected logical dependency flow is:

```text
users
  ↓
artisan_profiles
  ↓
products
  ↓
inventory
  ↓
quote_requests
  ↓
quote_request_artisans
```

Embeddings are associated with searchable product data and use pgvector once the embedding model and dimension are finalized.

## 5.1 Database integration checklist

Verify:

- Required migrations exist.
- Migrations apply successfully.
- Tables are present.
- Primary keys are correct.
- Foreign keys are correct.
- Required indexes exist.
- Product records can be inserted.
- Inventory records correctly reference products/artisans.
- Quote-request relationships work.
- pgvector is available where required.
- Seed/demo data follows the current schema.

## 5.2 Insert order

When creating a new demo flow, respect dependencies.

For example:

```text
Create user
   ↓
Create artisan profile
   ↓
Create product
   ↓
Create inventory
   ↓
Create searchable/embedding data
   ↓
Create buyer request
   ↓
Create artisan allocation
```

Do not insert child records before their referenced parent records exist.

---

# 6. Backend Integration

The backend uses FastAPI and exposes the application API.

Important existing API areas include:

```text
POST /api/catalogue/generate
POST /api/search
POST /api/matching/bulk
POST /api/speech/transcribe
```

Always confirm the exact request and response contract in `API_CONTRACT.md` before connecting a frontend.

---

## 6.1 AI Catalogue Integration

Endpoint:

```text
POST /api/catalogue/generate
```

Expected high-level flow:

```text
Image
  +
artisan_id
  +
optional voice_text
  ↓
Catalogue API
  ↓
Catalogue Service
  ↓
AI processing
  ↓
Validated catalogue result
  ↓
Frontend
```

The catalogue API accepts an uploaded image, an artisan identifier, and optional voice text.

Important:

- Validate the uploaded file.
- Validate the artisan UUID.
- Make sure the catalogue service dependency is configured.
- Validate the AI result before returning/storing it.
- Do not expose provider-specific implementation details to the frontend unless the contract requires them.

The existing `backend/app/api/catalogue.py` is a router. The application composition layer must wire the catalogue service dependency.

---

## 6.2 Search Integration

Endpoint:

```text
POST /api/search
```

High-level flow:

```text
Buyer Query
   ↓
Search API
   ↓
Intent Extraction
   ↓
Embedding Generation
   ↓
Product Search
   ↓
Filtering / Ranking
   ↓
Search Results
   ↓
Buyer UI
```

The search request can include:

```text
query
quantity
budget_per_unit
location
require_full_capacity
```

Integration must preserve the exact field names and response structure defined in `API_CONTRACT.md`.

---

## 6.3 Bulk Matching Integration

Endpoint:

```text
POST /api/matching/bulk
```

High-level flow:

```text
Buyer Requirement
   ↓
Search / Matching
   ↓
Available Artisan Capacity
   ↓
Multi-Artisan Allocation
   ↓
Artisan Pool
   ↓
Quote Request
```

Verify that:

- inventory/capacity data is current,
- artisans are correctly related to products,
- available capacity is calculated correctly,
- allocation does not exceed capacity,
- returned artisan information matches the frontend contract.

---

## 6.4 Speech Integration

Endpoint:

```text
POST /api/speech/transcribe
```

High-level flow:

```text
Voice Input
   ↓
Speech API
   ↓
Sarvam Speech Provider
   ↓
Transcribed Text
   ↓
Catalogue / Search Flow
```

Verify:

- audio upload format,
- API request format,
- Sarvam configuration,
- transcription response,
- frontend handling of loading/errors.

---

# 7. Backend Application Composition

One important integration point is the FastAPI application itself.

The files under:

```text
backend/app/api/
```

define routers/endpoints.

There must also be one clear application-composition point responsible for:

```text
FastAPI()
    ↓
include routers
    ↓
configure dependencies
    ↓
configure CORS
    ↓
health/check endpoints
    ↓
start application
```

Do not create multiple competing FastAPI application objects.

When integrating a router:

1. Import the router in the application composition layer.
2. Register it with `include_router(...)`.
3. Confirm the resulting route path.
4. Start the backend.
5. Test the endpoint.

Example conceptually:

```python
app.include_router(catalogue_router)
app.include_router(search_router)
app.include_router(speech_router)
```

Use the actual application structure already present in the repository.

---

# 8. Frontend Integration

There are two main frontend experiences:

```text
frontend/artisan/
frontend/buyer/
```

## 8.1 Artisan UI

The intended flow is:

```text
Artisan opens application
    ↓
Upload product image
    ↓
Optional voice description
    ↓
Generate catalogue
    ↓
Review generated information
    ↓
Accept / edit
    ↓
Publish product
```

The frontend should:

- send requests to the backend API,
- show loading states,
- show validation/API errors,
- display generated catalogue data,
- allow review before publishing,
- refresh/display the published product correctly.

## 8.2 Buyer UI

The intended flow is:

```text
Buyer enters natural-language requirement
    ↓
Search API
    ↓
Semantic results
    ↓
Capacity-aware artisan results
    ↓
Select artisans/products
    ↓
Request quote
```

The buyer UI should handle:

- search input,
- loading state,
- empty results,
- API errors,
- result cards,
- price information,
- availability/capacity,
- artisan information,
- quote-request action.

---

# 9. API Contract Integration

Before connecting frontend and backend, verify all of the following:

### Endpoint

```text
HTTP method
URL/path
```

### Request

```text
field names
field types
required vs optional fields
content type
file upload format
UUID format
```

### Response

```text
field names
nested objects
arrays
nullable values
IDs
image URLs/paths
```

### Error handling

The frontend should not assume every failed request returns a successful response object.

The project should use the error structure defined by the current API contract. Where applicable, the expected shape is:

```json
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

Always verify the actual contract before implementing error parsing.

### Common integration mistake

Backend:

```text
artisan_id
```

Frontend:

```text
artisanId
```

These are not automatically equivalent.

Do not rename API fields on one side without intentionally updating the contract and every dependent consumer.

---

# 10. Image Integration

Images have two different concerns:

```text
External/source image
        ↓
Acquisition/reference
        ↓
Supabase Storage
        ↓
Application image URL/path
```

Do not assume that an external source URL is the same thing as the application's storage URL.

For dataset work, fields such as:

```text
image_manifest.image_url
image_manifest.image_storage_path
```

should be treated according to their defined meaning.

Likewise, `products.image_url` should follow the application's current storage contract.

## Image integration checklist

Verify:

- source image URL works,
- image can be acquired when required,
- image is uploaded to the correct Supabase Storage bucket,
- storage object path is correct,
- backend returns the expected image URL/path,
- frontend can render the image,
- broken images have a visible fallback,
- external URLs are not silently treated as permanent application storage.

---

# 11. AI Integration

The main AI-related components include:

```text
Catalogue generation
Speech transcription
Search intent extraction
Embeddings
Semantic search
```

High-level catalogue pipeline:

```text
Image / Voice
    ↓
AI Provider
    ↓
Structured Output
    ↓
Schema Validation
    ↓
Database / API Response
```

High-level search pipeline:

```text
Natural-language query
    ↓
Intent extraction
    ↓
Embedding
    ↓
Vector/database search
    ↓
Filters
    ↓
Ranking
    ↓
Results
```

### AI integration rules

- Provider keys must come from environment configuration.
- AI output is not automatically trusted.
- Validate structured output.
- Handle provider failures.
- Handle empty/invalid AI responses.
- Do not hardcode model-specific assumptions in multiple places.
- Embedding dimensions must match the configured vector schema.

---

# 12. Search + Database Integration

For semantic/product search, confirm that the database contains the fields needed by the search pipeline.

Depending on the current schema and implementation, verify relevant data such as:

```text
product title
category
material
craft type
price
availability
production capacity
artisan relation
search text
tags
attributes
embedding
```

The embedding model and vector dimension must be consistent:

```text
Embedding model
      ↓
Embedding vector
      ↓
pgvector column
      ↓
Similarity search
```

If the model changes, verify whether the database vector dimension also needs to change.

---

# 13. CORS and Frontend ↔ Backend Connection

A very common integration issue is:

```text
Frontend
   ↓
Browser
   ↓
CORS restriction
   X
Backend
```

Configure CORS for the actual frontend development/production origins.

Do not solve CORS issues by globally disabling security.

Verify:

- frontend origin,
- backend URL,
- HTTP/HTTPS protocol,
- port,
- allowed methods,
- allowed headers,
- credentials policy if applicable.

---

# 14. Testing Procedure

Integration is not complete until the connected flow has been tested.

## 14.1 Backend unit tests

Run the repository's backend test suite.

Typical command:

```bash
pytest
```

If dependencies are required first, install the backend requirements according to the repository instructions.

---

## 14.2 API smoke testing

Test each important endpoint independently.

### Catalogue

```text
POST /api/catalogue/generate
```

Check:

- valid image,
- valid artisan ID,
- optional voice text,
- successful response,
- invalid image,
- invalid artisan ID,
- missing required fields,
- AI/provider failure.

### Search

```text
POST /api/search
```

Check:

- normal natural-language query,
- filters,
- quantity,
- budget,
- location,
- empty result,
- malformed request.

### Matching

```text
POST /api/matching/bulk
```

Check:

- available capacity,
- insufficient capacity,
- multiple artisans,
- no matching artisan,
- allocation limits.

### Speech

```text
POST /api/speech/transcribe
```

Check:

- valid audio,
- invalid/missing audio,
- provider failure,
- empty transcription.

---

# 15. Frontend Testing

For both Artisan and Buyer UIs, test:

### Page loading

- application starts,
- correct page renders,
- assets load,
- no console-breaking errors.

### API connection

- request reaches backend,
- correct HTTP method is used,
- correct path is used,
- payload matches API contract.

### Loading state

- button/input is disabled where appropriate,
- loading indicator appears,
- duplicate requests are prevented where needed.

### Success state

- backend response is displayed correctly,
- images render,
- IDs/data are preserved,
- navigation works.

### Error state

- 4xx errors are shown clearly,
- 5xx errors are handled,
- network failure is handled,
- empty data is handled.

---

# 16. End-to-End Hero Flow Test

Before declaring integration complete, test the complete MVP path.

```text
1. Artisan opens Artisan UI
        ↓
2. Upload product image
        ↓
3. Optional voice description
        ↓
4. Catalogue is generated
        ↓
5. Artisan reviews result
        ↓
6. Product is published
        ↓
7. Product exists in database
        ↓
8. Buyer opens Buyer UI
        ↓
9. Buyer searches naturally
        ↓
10. Search returns relevant products
        ↓
11. Capacity matching identifies available artisans
        ↓
12. Buyer selects result
        ↓
13. Quote request is created
```

The test is successful only if the data moves correctly across the actual system boundaries.

---

# 17. Error Diagnosis

When something fails, do not immediately rewrite code.

Use this sequence:

```text
1. Reproduce the error
        ↓
2. Identify the layer
        ↓
3. Read the exact error/log
        ↓
4. Check API contract
        ↓
5. Check environment variables
        ↓
6. Check database/network
        ↓
7. Make the smallest fix
        ↓
8. Re-run the failing test
        ↓
9. Run integration tests
```

## Common errors

| Error / Symptom | First place to check |
|---|---|
| Frontend does not start | Node dependencies, frontend configuration |
| Backend does not start | Python dependencies, environment variables, app composition |
| CORS error | Backend CORS configuration and frontend origin |
| `404` API error | Route registration and frontend API URL |
| `422` validation error | Request payload and API schema |
| `500` catalogue error | Catalogue service wiring, Gemini configuration, backend logs |
| `500` speech error | Sarvam configuration/provider |
| Search returns nothing | Database data, filters, repository, embeddings |
| Matching pool is empty | Inventory/capacity data |
| Foreign-key error | Parent record/ID and insert order |
| Product image is broken | Storage bucket, object path, source URL |
| Missing API key | `.env`/environment configuration |
| Correct backend but wrong frontend result | Response mapping/frontend state handling |

---

# 18. Integration Fix Workflow

Do not make random changes directly on `main`.

For an integration fix:

```bash
git checkout main
git pull origin main

git checkout -b integration/<short-description>
```

Example:

```bash
git checkout -b integration/fix-search-api
```

Then:

```text
Reproduce
   ↓
Identify issue
   ↓
Make smallest required fix
   ↓
Run tests
   ↓
Check affected UI/API
   ↓
Commit
   ↓
Push branch
   ↓
Create PR
   ↓
Review
   ↓
Merge into main
```

Example:

```bash
git add .
git commit -m "fix: connect buyer search to backend"
git push origin integration/fix-search-api
```

Do not push directly to `main` unless the team's agreed workflow explicitly permits it.

---

# 19. Integration Completion Checklist

## Repository

- [ ] Latest `main` pulled
- [ ] Repository documentation reviewed
- [ ] Correct branch created for integration fix
- [ ] No secrets committed

## Database

- [ ] Migrations apply successfully
- [ ] Required tables exist
- [ ] Foreign keys work
- [ ] Seed/demo data loads
- [ ] Product and inventory relationships work
- [ ] pgvector configuration is correct

## Backend

- [ ] FastAPI application starts
- [ ] Routers are registered
- [ ] Dependencies are configured
- [ ] CORS is configured
- [ ] Catalogue endpoint works
- [ ] Search endpoint works
- [ ] Matching endpoint works
- [ ] Speech endpoint works

## AI

- [ ] Gemini configuration works
- [ ] Sarvam configuration works
- [ ] Catalogue output is validated
- [ ] Search intent extraction works
- [ ] Embeddings work
- [ ] Vector dimension matches database configuration

## Artisan UI

- [ ] UI starts
- [ ] Image upload works
- [ ] Voice flow works if enabled
- [ ] Catalogue generation works
- [ ] Review flow works
- [ ] Publish flow works
- [ ] Errors are displayed

## Buyer UI

- [ ] UI starts
- [ ] Search works
- [ ] Results render
- [ ] Capacity information renders
- [ ] Artisan pool works
- [ ] Quote request works
- [ ] Empty/error states work

## End-to-End

- [ ] Artisan → Catalogue
- [ ] Catalogue → Product DB
- [ ] Buyer → Search
- [ ] Search → Matching
- [ ] Matching → Artisan Pool
- [ ] Artisan Pool → Quote Request
- [ ] Complete demo flow tested in browser

---

# 20. Final Integration Standard

Integration is complete when:

```text
Frontend
   ↕
API Contract
   ↕
FastAPI Backend
   ↕
Services / AI
   ↕
Supabase PostgreSQL + pgvector
   ↕
Supabase Storage
```

works as one connected system.

The most important rule is:

> **Do not judge integration by whether individual modules run independently. Judge it by whether data can successfully travel through the complete hero flow.**

When an integration problem appears:

```text
Do not guess.
Do not rewrite everything.
Do not bypass the contract.

Reproduce → Locate → Fix minimally → Test → Re-test the full flow.
```

---

# 21. Repository References

Before integration, use these files as the project's source of truth:

```text
README.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_CONTRACT.md
CONTRIBUTING.md

backend/app/api/
backend/app/services/
backend/app/schemas/
backend/tests/

database/migrations/
database/scripts/
database/seeds/

frontend/artisan/
frontend/buyer/
```

If this manual conflicts with the current implementation or the current API/database documentation, **do not silently choose one**. Verify the intended contract with the integration owner and update the implementation/documentation consistently.
