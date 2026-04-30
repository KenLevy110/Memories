# Memories Implementation Log

## Document control

| Field | Value |
| --- | --- |
| **Owner** | Engineering |
| **Status** | Active |
| **Last updated** | 2026-04-30 |
| **Template used** | Repository convention (implementation activity log) |
| **Related docs** | [product-requirements-v1.md](product-requirements-v1.md); [technical-design-v1.md](technical-design-v1.md); [development-plan-v1.md](development-plan-v1.md); [development-plan.md](development-plan.md) (pointer); [adr/README.md](adr/README.md) |

---

## Purpose

Track meaningful implementation work over time with enough context to support maintenance, onboarding, and incident response.

Use this log for code-level changes (features, fixes, refactors, infra changes) and link to ADRs when a change includes an architectural decision.

---

## Entry format

Each entry should include:

- Date
- Area (API, Web, Shared, Docs, Infra)
- Change summary (what shipped and why)
- Files and systems touched
- Validation performed (tests, lint, typecheck, manual checks)
- Follow-ups / risks
- Links (PR, issue, ADR, runbook)

---

## Entries

### 2026-04-30 - Observability baseline (`T13`) metric hooks + probe headers

- **Area:** API, Docs
- **Summary:** Added metadata-only structured observability hooks in `@memories/api` via `onResponse` logging events (`event=api_metric_hook`) keyed by route templates and status families. Disabled Fastify default request logging to avoid unstructured/raw request payload logging. Added probe-friendly `/health` headers (`cache-control: no-store`, `x-health-probe: legacy-api`) and preserved unauthenticated health behavior.
- **Metric names (aligned to TDD §3.3 alert themes):**
  - `memories_api_health_requests_total`
  - `memories_api_health_latency_ms`
  - `memories_api_memories_list_requests_total`
  - `memories_api_memories_list_latency_ms`
  - `memories_api_upload_sign_image_requests_total`
  - `memories_api_upload_sign_image_latency_ms`
  - `memories_api_upload_sign_audio_requests_total`
  - `memories_api_upload_sign_audio_latency_ms`
  - `memories_api_memory_finalize_requests_total`
  - `memories_api_memory_finalize_latency_ms`
  - `memories_api_media_sign_read_requests_total`
  - `memories_api_media_sign_read_latency_ms`
  - Reserved for prompt path once endpoint is enabled: `memories_api_suggest_prompt_requests_total`, `memories_api_suggest_prompt_latency_ms`
- **Touched:** `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `docs/development-plan-v1.md`, `docs/implementation-log.md`
- **Validation:** `npm run lint`, `npm run typecheck`, `npm run test`
- **Follow-ups:** Wire these metric names into dashboard queries/alerts and fill §5.1 Decision owner/query links as observability backends are finalized.

### 2026-04-30 - Legacy product branding (symbol, UI copy, health id)

- **Area:** Web, Shared, API, Docs
- **Summary:** Unified **`brand/symbol-master.svg`** and **`apps/web/public/favicon.svg`** with the Legacy frame + heart lockup; **`serviceName`** → `legacy`; **`GET /health`** / **`HEAD /health`** body **`service`** → `legacy-api`; startup logs say Legacy API. **`apps/web`** title and splash use **Legacy**; **`README`**, **`AGENTS.md`**, **`brand/README.md`**, root **`package.json`** description updated for customer-facing name. **JWT `aud`** stays **`memories-api`** (`.env.example`, local-auth helper, tests) so existing IdP tokens keep working; REST paths and DB identifiers unchanged.
- **Touched:** `brand/symbol-master.svg`, `brand/logo-full-color.svg`, `brand/README.md`, `apps/web/public/favicon.svg`, `apps/web/index.html`, `apps/web/src/App.tsx`, `packages/shared/src/index.ts`, `packages/shared/src/index.test.ts`, `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `apps/api/src/index.ts`, `README.md`, `AGENTS.md`, `package.json`, `docs/implementation-log.md`
- **Validation:** `npm run test`

### 2026-04-30 - Brand folder + Memories symbol

- **Area:** Web, Docs
- **Summary:** Added `brand/` (masters aligned with Ohana `cursor-template`), Memories-specific README with voice/color tokens, `symbol-master.svg` + `logo-full-color.svg`, synced `apps/web/public/favicon.svg`, splash uses mark + primary heading color; template verify scripts require `brand/README.md` and `brand/symbol-master.svg`; README layout, `NEW_PROJECT_CHECKLIST`, and `TEMPLATE_SYNC` reference branding workflow.
- **Touched:** `brand/`, `apps/web/public/favicon.svg`, `apps/web/src/App.tsx`, `scripts/verify-template.ps1`, `scripts/verify-template.sh`, `README.md`, `NEW_PROJECT_CHECKLIST.md`, `TEMPLATE_SYNC.md`, `docs/implementation-log.md`
- **Validation:** `.\scripts\verify-template.ps1`; `npm run typecheck --workspace=@memories/web`

### 2026-04-30 - Memory finalize + CRUD API (`T8`, `T9`)

- **Area:** API, Database, Security
- **Summary:** Added `POST /api/v1/clients/:clientId/memories` idempotent finalize (with `Idempotency-Key` support and Stage 0.5 media caps: max 1 image + 1 audio), plus `GET` list/detail, `PATCH`, and soft `DELETE` routes under `/api/v1/clients/:clientId/memories...`. Added role-gated mutation authz for memory CRUD, cursor pagination, and mutation audit event writes in the default DB-backed repository.
- **Touched:** `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `docs/development-plan-v1.md`, `docs/implementation-log.md`
- **Validation:** `npm run typecheck --workspace=@memories/api`; `npm test --workspace=@memories/api`

### 2026-04-30 - Playback sign-read endpoint (`T7`)

- **Area:** API, Security
- **Summary:** Implemented `POST /api/v1/memory-media/:mediaId/sign-read` with dedicated playback signing (separate from upload signing), scoped media lookup, and deny-by-default authz checks so callers only receive read URLs for media inside their allowed practice/client scope.
- **Touched:** `apps/api/src/app.ts`, `apps/api/src/app.test.ts`, `apps/api/package.json`, `docs/development-plan-v1.md`, `docs/implementation-log.md`
- **Validation:** `npm run typecheck --workspace=@memories/api`; `npm test --workspace=@memories/api`

### 2026-04-30 - Fix API `.env` path (monorepo root)

- **Area:** API
- **Summary:** **`apps/api/src/index.ts`** loaded **`.env`** from **`apps/`** (`../..` from `src/`) instead of the repo root, so **`JWT_*`** and other root vars were never applied when running **`npm run dev`** / **`dev:api`**. Resolved with **`../../..`** from **`src/`**.
- **Touched:** `apps/api/src/index.ts`, `docs/implementation-log.md`
- **Validation:** `npm run test -w @memories/api`

### 2026-04-30 - Local JWT dev helper and clearer API startup errors

- **Area:** API, Docs, Infra (local DX)
- **Summary:** **`@memories/api`** now reports **which** of **`JWT_ISSUER` / `JWT_AUDIENCE` / `JWT_JWKS_URI`** are missing when startup fails. Added **`npm run dev:local-auth`** (root) / **`apps/api/scripts/local-auth-dev.ts`**: **127.0.0.1**-only JWKS + **`GET /dev/token`** for short-lived dev JWTs. **`.env.example`** documents defaults aligned with that helper; **README** and **AGENTS** describe the two-terminal flow with **`npm run dev`**.
- **Touched:** `apps/api/src/app.ts`, `apps/api/scripts/local-auth-dev.ts`, `apps/api/package.json`, root `package.json`, `.env.example`, `README.md`, `AGENTS.md`, `docs/implementation-log.md`
- **Validation:** `npm run test -w @memories/api`; `npm run typecheck -w @memories/api`
- **Follow-ups:** Replace helper with platform IdP in staging/prod; do not expose **`dev:local-auth`** beyond localhost.

### 2026-04-30 - Development plan coordination (§5.1, E12/T23–T24, Skills policy)

- **Area:** Docs
- **Summary:** **`docs/development-plan-v1.md` v1.2** defines **§5.1 NFR-010** starter alerts, **§12.1** session-default vs lean **Skills**, **E12** + **T23**/**T24** (**FR-017**/**FR-018**) with **Definition of ready** and prompts. **`.cursor/skills/developer-manager/SKILL.md`** aligned. PRD/TDD **v1.4** cite **§5.1**.
- **Touched:** `docs/development-plan-v1.md`, `docs/product-requirements-v1.md`, `docs/technical-design-v1.md`, `.cursor/skills/developer-manager/SKILL.md`, `docs/implementation-log.md`
- **Follow-ups:** Fill **Decision owner** column in §5.1 table; unblock **T23** with Dashboard JWT + PM gate.

### 2026-04-30 - Remove `docs/examples` (foreign multi-list samples)

- **Area:** Docs
- **Summary:** Deleted **`docs/examples/multi-list/`** sample PRD/TDD/wireframes (different product, outdated plan links). **`AGENTS.md`** now points structure reference to editioned **`docs/*-v1.md`** plus **`docs/templates/`**.
- **Touched:** `docs/examples/` (removed), `AGENTS.md`, `docs/implementation-log.md`
- **Validation:** Grep for broken `docs/examples` references (none required outside removed files).

### 2026-04-30 - Development plan versioning (governance)

- **Area:** Docs / Governance
- **Summary:** Aligned **AGENTS.md**, **docs-governance**, PRD/TDD/tech-stack links, and **`developer-manager`** skill with **editioned** `docs/development-plan-v1.md` plus optional **`docs/development-plan.md`** pointer. **development-planner** skill already prefers `development-plan-v{N}.md`; **cursor-template** mirrors template + governance wording.
- **Touched:** `AGENTS.md`, `.cursor/rules/docs-governance.mdc`, `.cursor/skills/developer-manager/SKILL.md`, `docs/development-plan.md`, `docs/templates/development-plan-template.md`, `docs/product-requirements-v1.md`, `docs/technical-design-v1.md`, `docs/tech-stack.md`, `docs/implementation-log.md`
- **Validation:** Cross-link pass; pointer resolves to `development-plan-v1.md`.
- **Links:** [development-plan-v1.md](development-plan-v1.md)

### 2026-04-30 - Technical decisions documented (SoR, auth, routing)

- **Area:** Docs / Architecture
- **Summary:** Accepted **ADR-20260430** (platform vs Memories system-of-record split, JWT verification, TanStack Router + `?step=`, client-side drafts, Postgres job queue + poll for transcripts, Drizzle, S3 key layout, pilot policies). Updated **technical-design-v1.md** to v1.1 Approved, **tech-stack.md** to Approved, **product-requirements-v1.md** open questions resolved and FR-007 clarified. Ken Levy recorded as engineering owner and sign-off.
- **Touched:** `docs/adr/ADR-20260430-memories-platform-boundary-auth-routing.md`, `docs/adr/README.md`, `docs/adr/ADR-20260423-postgres-system-of-record.md`, `docs/technical-design-v1.md`, `docs/tech-stack.md`, `docs/product-requirements-v1.md`, `docs/memories-user-workflow-v1.md`, `docs/implementation-log.md`
- **Validation:** Doc consistency pass; cross-links between PRD, TDD, tech-stack, ADR index.
- **Follow-ups:** Coordinate JWT claim names with Dashboard; lock STT/LLM vendor instances after BAAs; keep [development-plan-v1.md](development-plan-v1.md) thresholds and owners updated as alerting lands.
- **Links:** [ADR-20260430](adr/ADR-20260430-memories-platform-boundary-auth-routing.md)

### 2026-04-23 - Documentation governance baseline

- **Area:** Docs / Project governance
- **Summary:** Synced updated documentation templates from `cursor-template` and introduced implementation + ADR tracking structure in this repository.
- **Touched:** `docs/templates/product-requirements-template.md`, `docs/templates/technical-design-template.md`, `docs/templates/development-plan-template.md`, `docs/templates/design-wireframe-template.md`, `docs/implementation-log.md`, `docs/adr/README.md`, ADR starter files.
- **Validation:** File sync and repository structure checks.
- **Follow-ups:** Add implementation entries for all future non-trivial feature/fix work. Keep ADR statuses current when decisions are accepted or superseded.
- **Links:** [ADR index](adr/README.md)
