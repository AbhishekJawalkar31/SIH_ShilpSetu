# ShilpSetu — Contribution & Codex Workflow

## 1. Purpose

This document defines how the ShilpSetu team develops, commits, reviews, and integrates code.

The project uses:

- GitHub — source of truth
- OpenAI Codex — AI coding/development agent
- Feature branches — isolated development
- `main` — integrated project version

The goal is to allow six people to work in parallel without breaking shared architecture, database schema, or API contracts.

---

# 2. Golden Rule

> **Do not code before understanding the existing repository.**

Before making changes, every contributor and their Codex agent must inspect:

```text
README.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_CONTRACT.md
CONTRIBUTING.md
```

Then inspect the relevant existing code.

The agent must follow the existing architecture and contracts rather than inventing a parallel implementation.

---

# 3. Branch Structure

The current team branches are:

```text
main
├── artisan-ui
├── buyer-ui
├── backend
├── database
├── ai-catalogue
└── search-matching
```

### Branch ownership

| Branch | Primary responsibility |
|---|---|
| `artisan-ui` | Artisan mobile-first frontend |
| `buyer-ui` | Buyer marketplace/search frontend |
| `backend` | FastAPI APIs and backend orchestration |
| `database` | Supabase/PostgreSQL schema, migrations and seed data |
| `ai-catalogue` | Gemini catalogue generation + Sarvam speech integration |
| `search-matching` | Embeddings, semantic search and B2B matching |

Branch ownership means primary responsibility, not exclusive access.

---

# 4. `main` Branch

`main` represents the latest integrated version of ShilpSetu.

Team rule:

> **Nobody intentionally pushes directly to `main`.**

The repository currently uses GitHub Free, so automatic branch protection is not available for this private personal repository.

Therefore the team enforces the rule through workflow:

```text
Feature branch
      ↓
Commit
      ↓
Push
      ↓
Pull Request
      ↓
Review / integration check
      ↓
Merge into main
```

The integration owner manually controls merges.

---

# 5. Starting Work

Before starting a new task:

```bash
git checkout main
git pull origin main
```

Then switch to the contributor's assigned branch:

```bash
git checkout artisan-ui
```

or the relevant branch.

If the branch already exists, do not create a new branch with a different name for the same responsibility without coordination.

---

# 6. Keeping a Feature Branch Updated

Before beginning a major change, update the local branch from the latest `main`.

Preferred workflow:

```bash
git checkout main
git pull origin main
git checkout <your-branch>
git merge main
```

Example:

```bash
git checkout main
git pull origin main

git checkout artisan-ui
git merge main
```

If conflicts occur, resolve them carefully and test the affected feature.

Do not blindly overwrite another contributor's changes.

---

# 7. Codex Workflow

Every contributor should use a scoped Codex task.

### Recommended initial prompt

```text
You are working on the ShilpSetu repository.

Before changing anything:

1. Read README.md.
2. Read ARCHITECTURE.md.
3. Read DATABASE_SCHEMA.md.
4. Read API_CONTRACT.md.
5. Read CONTRIBUTING.md.
6. Inspect the existing code relevant to this task.

Task:
<describe ONE specific feature>

Work only within the assigned responsibility/branch.

Follow the existing architecture, database schema, API contracts, naming conventions, and folder structure.

Do not redesign the architecture.
Do not invent new API fields or database fields when an existing contract already defines them.
Do not modify unrelated modules.
Do not modify shared contracts unless explicitly instructed.

Before finishing:
- run relevant tests/checks
- verify the feature integrates with existing code
- summarize changed files
- summarize any assumptions
- identify any unresolved issues
```

---

# 8. Scope Codex Tasks

Do not give Codex vague instructions such as:

```text
"Build ShilpSetu."
```

Prefer:

```text
"Implement the artisan product image upload UI in the artisan-ui branch. Use the existing API contract. Do not modify backend code."
```

or:

```text
"Implement POST /api/catalogue/generate in the backend using the existing API contract. Do not change the response schema."
```

or:

```text
"Implement pgvector product retrieval using the existing product_embeddings schema. Do not introduce another vector database."
```

Small, scoped tasks reduce accidental changes to other modules.

---

# 9. File Ownership Guidelines

## `artisan-ui`

Primarily modify:

```text
frontend/artisan/
```

Do not redesign:

- backend APIs
- database schema
- search logic

---

## `buyer-ui`

Primarily modify:

```text
frontend/buyer/
```

Use the existing search and quote APIs.

Do not create direct database access from the frontend.

---

## `backend`

Primarily modify:

```text
backend/
```

Responsible for:

- FastAPI routes
- validation
- orchestration
- database access
- service integration

Backend contributors must follow `API_CONTRACT.md`.

---

## `database`

Primarily modify:

```text
database/
```

Responsible for:

- migrations
- schema implementation
- seed data
- database-related setup

The database contributor implements the frozen schema.

They do not independently redesign it.

---

## `ai-catalogue`

Responsible for:

- Gemini integration
- Sarvam speech-to-text integration
- structured catalogue generation
- AI output validation

AI providers must remain behind backend/service interfaces.

API keys must never be committed to GitHub.

---

## `search-matching`

Responsible for:

- embeddings
- pgvector retrieval
- semantic search
- intent-to-search processing
- capacity-aware B2B matching
- ranking logic

Do not introduce a separate vector database for the MVP.

---

# 10. Shared Files

The following files affect the entire team:

```text
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_CONTRACT.md
CONTRIBUTING.md
README.md
```

Do not casually modify them.

If a change is genuinely necessary:

```text
1. Explain why.
2. Identify affected modules.
3. Update the relevant documentation.
4. Update dependent code.
5. Test the affected flow.
6. Inform the integration owner.
```

---

# 11. Dependencies

Contributors may add required packages to their feature branch.

Do not ask the integration owner for permission for every package.

However:

- Add only packages actually needed.
- Use stable, appropriate packages.
- Update the correct dependency file.
- Do not introduce duplicate libraries for the same purpose.
- Do not remove existing dependencies without checking their usage.
- Mention important dependency changes in the Pull Request.

The dependency change becomes part of the integrated project only after the branch is merged.

---

# 12. Environment Variables and Secrets

Never commit:

```text
API keys
passwords
tokens
service-role keys
private credentials
.env files containing real secrets
```

Use an environment file locally:

```text
.env
```

Commit a safe template:

```text
.env.example
```

Example:

```text
GEMINI_API_KEY=
SARVAM_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
DATABASE_URL=
```

Use placeholder values only.

---

# 13. Commit Guidelines

Commits should be small and descriptive.

Preferred format:

```text
feat: add artisan image upload
feat: implement catalogue generation endpoint
feat: add semantic product search
fix: handle empty search results
fix: validate product price
chore: update backend dependencies
docs: update API contract
```

Avoid:

```text
update
changes
final
final2
working
stuff
```

A commit should represent one logical change where practical.

---

# 14. Pull Request Workflow

When a feature is ready:

```bash
git status
git add .
git commit -m "feat: <description>"
git push origin <your-branch>
```

Then open a Pull Request on GitHub.

Example:

```text
base: main
compare: artisan-ui
```

PR title:

```text
feat: implement artisan product upload
```

---

# 15. Pull Request Description

Every PR should briefly contain:

```text
## What changed
- ...

## Why
- ...

## Files/modules changed
- ...

## Testing
- ...

## Dependencies
- None / list changes

## Integration notes
- ...
```

Example:

```text
## What changed
- Added mobile-first product image upload UI
- Connected upload flow to catalogue endpoint

## Testing
- Tested image upload locally
- Tested loading/error states

## Integration notes
- Uses POST /api/catalogue/generate
- No API contract changes
```

---

# 16. Integration Owner Workflow

The integration owner is responsible for maintaining `main`.

For every PR:

```text
1. Read the PR description.
2. Inspect changed files.
3. Check that shared contracts were followed.
4. Check for unrelated changes.
5. Pull/merge the branch locally if needed.
6. Run the relevant application flow.
7. Fix or request fixes for integration problems.
8. Merge only when the feature is compatible.
```

The integration owner is currently the project owner.

---

# 17. Integration Testing

A feature is not considered fully complete merely because it works in isolation.

For example, catalogue generation is complete only when the relevant flow works:

```text
Artisan UI
    ↓
FastAPI
    ↓
Sarvam / Gemini
    ↓
Structured catalogue
    ↓
Database
    ↓
Response
    ↓
Artisan UI
```

Search is complete only when:

```text
Buyer UI
    ↓
FastAPI
    ↓
Intent / embedding
    ↓
pgvector
    ↓
Filtering / ranking
    ↓
Results
    ↓
Buyer UI
```

The integration owner should prioritize end-to-end testing of the hero demo flow.

---

# 18. Conflict Handling

If two branches modify the same code:

```text
Do not immediately overwrite either version.
```

Instead:

1. Identify what each change does.
2. Determine which behavior is required by the architecture/API contract.
3. Combine the compatible parts.
4. Test the result.
5. If the conflict changes a shared contract, update the documentation first.

---

# 19. What Contributors Must NOT Do

Do not:

- Push intentionally to `main`
- Rewrite another teammate's module
- Create a new database without approval
- Create a separate vector database for MVP
- Change API response fields silently
- Rename shared database columns without coordination
- Commit secrets
- Replace the agreed stack without discussion
- Build unrelated features
- Rewrite the entire project because Codex thinks another architecture is better
- Delete another contributor's work without coordination
- Treat AI-generated code as automatically correct

---

# 20. Definition of Done

A task is considered done when:

- The assigned feature is implemented.
- Existing architecture is preserved.
- Existing API/database contracts are followed.
- Relevant tests/checks pass.
- No secrets are committed.
- No unrelated files were changed unnecessarily.
- The feature works with dependent modules where applicable.
- The branch is pushed to GitHub.
- A Pull Request is opened.
- Integration notes are provided.

---

# 21. Emergency Rule for the 2-Day MVP

The priority is:

```text
WORKING END-TO-END FLOW
        >
PERFECT ARCHITECTURE
        >
EXTRA FEATURES
```

If a feature is blocked, do not spend hours building infrastructure that is not required for the demo.

Prefer a simple reliable implementation that follows the contracts.

Do not silently introduce shortcuts that break the shared architecture.

---

# 22. Team Workflow Summary

```text
                    🟢 MAIN
               Integrated version
                      ↑
                      |
                 Pull Request
                      |
       +--------------+--------------+
       |              |              |
       ↓              ↓              ↓
 artisan-ui       buyer-ui       backend
       |              |              |
       +--------------+--------------+
       |              |
       ↓              ↓
ai-catalogue    search-matching

database branch
       |
       ↓
database migrations/schema
```

Every contributor:

```text
1. Pull latest main
2. Work only on assigned branch
3. Ask Codex to inspect project docs first
4. Make scoped changes
5. Test
6. Commit
7. Push
8. Open PR
9. Integration owner reviews
10. Merge into main
```

---

# 23. Golden Codex Instruction

When in doubt, use this:

```text
Before making any changes, inspect the existing repository and read:

README.md
ARCHITECTURE.md
DATABASE_SCHEMA.md
API_CONTRACT.md
CONTRIBUTING.md

Follow the existing architecture and contracts.

Work only on the assigned task and branch.

Do not redesign the project.
Do not invent new APIs or database fields when existing contracts already cover the requirement.
Do not modify unrelated modules.
Do not expose or commit secrets.
Do not change shared contracts without explicit approval.

Reuse existing code where appropriate.

Before finishing, run relevant checks/tests and report:
1. Files changed
2. What was implemented
3. Tests/checks performed
4. Dependencies added
5. Any assumptions
6. Any integration risks
```

This instruction should be included in the initial Codex prompt for every major task.
