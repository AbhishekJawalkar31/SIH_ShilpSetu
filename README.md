# ShilpSetu

> **From Local to Vocal** — AI-driven market linkage and smart cataloguing for marginalized artisans.

ShilpSetu is an artisan-first marketplace that reduces the digital barriers involved in creating product listings and connects artisans directly with buyers, including bulk/B2B buyers.

---

## MVP Goal

The MVP demonstrates one complete end-to-end journey:

```text
ARTISAN
Image / Voice
      ↓
AI Catalogue Generation
      ↓
AI Price Recommendation
      ↓
Artisan Reviews & Publishes
      ↓
PRODUCT DATABASE
      ↓
BUYER
Natural-Language Search
      ↓
Semantic Search + Capacity Matching
      ↓
Artisan Pool
      ↓
REQUEST QUOTE
```

### Hero B2B Example

A buyer can ask:

> "I need 100 handmade jute bags for my hotel under ₹700 each."

ShilpSetu extracts the requirement, finds semantically relevant products, checks artisan capacity/availability, ranks candidates, and can form a pool of artisans whose combined capacity can satisfy the requirement.

---

## Core Features

### Artisan

- Mobile-first interface
- Product image upload
- Voice/text product information
- AI-assisted catalogue generation
- Competitive price recommendation
- Artisan-controlled final price
- Product publishing
- Availability and production capacity

### Buyer

- Marketplace browsing
- Natural-language search
- Semantic product discovery
- Bulk/B2B requirement matching
- Multi-artisan capacity matching
- Request Quote

---

## Technology Stack

| Layer | Technology |
|---|---|
| Source control | GitHub |
| AI coding | OpenAI Codex |
| Frontend | React / Next.js |
| Backend | FastAPI / Python |
| Database | Supabase PostgreSQL |
| Vector search | pgvector |
| Image storage | Supabase Storage |
| Catalogue/image AI | Gemini multimodal |
| Speech-to-text | Sarvam Saaras |
| Embeddings | Selected embedding model compatible with pgvector |

**Replit is not used in this project workflow.**

---

## Repository Structure

```text
shilpsetu/
│
├── frontend/
│   ├── artisan/
│   └── buyer/
│
├── backend/
├── ai/
├── database/
├── data/
│
├── README.md
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
├── API_CONTRACT.md
└── CONTRIBUTING.md
```

---

## Branches

```text
main
├── artisan-ui
├── buyer-ui
├── backend
├── database
├── ai-catalogue
└── search-matching
```

### Branch responsibilities

| Branch | Responsibility |
|---|---|
| `artisan-ui` | Artisan mobile-first frontend |
| `buyer-ui` | Buyer marketplace frontend |
| `backend` | FastAPI APIs and backend orchestration |
| `database` | PostgreSQL/Supabase schema, migrations and seed data |
| `ai-catalogue` | Gemini catalogue generation and Sarvam speech integration |
| `search-matching` | Embeddings, semantic search and B2B matching |

`main` is the integrated version of the project.

The team workflow is defined in `CONTRIBUTING.md`.

---

## Before You Code

Every contributor must first read:

```text
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_CONTRACT.md
CONTRIBUTING.md
```

Then inspect the existing code relevant to the assigned task.

Do not independently redesign shared architecture, database tables, or API contracts.

---

## Codex Workflow

ShilpSetu uses OpenAI Codex as the team's AI coding/development agent.

Every Codex task should be scoped to one feature or responsibility.

Use this principle:

```text
Read → Inspect → Plan → Implement → Test → Report
```

### Required Codex behavior

Before editing:

- Read the project documentation.
- Inspect existing code.
- Reuse existing interfaces and utilities.
- Follow the assigned branch responsibility.
- Do not modify unrelated modules.
- Do not invent API/database contracts that already exist.
- Never commit secrets.

Before finishing:

- Run relevant checks/tests.
- Verify integration with existing code.
- Report changed files.
- Report dependencies added.
- Report assumptions and integration risks.

See `CONTRIBUTING.md` for the complete Codex prompt and workflow.

---

## Development Flow

```text
1. Pull latest main
        ↓
2. Work on assigned branch
        ↓
3. Implement scoped task
        ↓
4. Test locally
        ↓
5. Commit
        ↓
6. Push branch
        ↓
7. Open Pull Request
        ↓
8. Integration owner checks
        ↓
9. Merge into main
```

Because the current repository is a private GitHub Free repository, the team follows the no-direct-push-to-main rule manually.

---

## API

The shared frontend/backend interface is defined in:

```text
API_CONTRACT.md
```

Do not silently change endpoint names, request fields, or response fields.

---

## Database

The canonical MVP schema is defined in:

```text
DATABASE_SCHEMA.md
```

The project uses:

- Supabase PostgreSQL
- pgvector
- Supabase Storage

Database changes must use migrations and follow the documented schema-change process.

---

## Architecture

The complete system architecture and AI/data flows are defined in:

```text
ARCHITECTURE.md
```

Important architectural principles:

- FastAPI is the central backend.
- PostgreSQL is the structured-data source of truth.
- pgvector handles semantic search.
- Supabase Storage holds product images.
- Gemini handles multimodal catalogue generation.
- Sarvam handles speech-to-text.
- AI recommends prices; artisans control final prices.
- Bulk requirements can be satisfied by multiple artisans.
- No unnecessary microservices or separate vector database for the MVP.

---

## MVP Scope

### Must work

- Artisan mobile-first UI
- Product image upload
- Voice/text input
- AI catalogue generation
- Price recommendation
- Product publishing
- Buyer marketplace
- Natural-language search
- Semantic search
- Artisan capacity
- B2B artisan-pool matching
- Request Quote

### Not required for the 2-day MVP

- Payment gateway
- Subscription billing implementation
- Real WhatsApp/SMS integration
- Large-scale model training
- Kubernetes/microservices
- Native Flutter APK
- AR/3D product features

---

## Project Rule

### Build the working hero flow first.

```text
Image/Voice
    ↓
Catalogue
    ↓
Price recommendation
    ↓
Publish
    ↓
Natural-language buyer search
    ↓
Semantic retrieval
    ↓
Capacity-aware B2B matching
    ↓
Request Quote
```

Everything else is secondary until this flow works end-to-end.

---

## Documentation Source of Truth

When documentation and implementation disagree:

1. Do not silently choose one.
2. Identify the mismatch.
3. Notify the integration owner.
4. Update the relevant contract/documentation.
5. Then update dependent code.

This prevents six independent Codex agents from creating incompatible versions of ShilpSetu.
