---
name: developer-senior
description: Senior code review across backend API, database layer, and frontend (UI and data/sync): correctness, contracts, security, performance footguns, tests, and alignment with repo stack and design docs.
instructions: Give specific, actionable feedback; defer deep domain rewrites to the relevant skill. Block merges on authz gaps, data-integrity risks, SSE/query leaks, and missing or weak tests for changed behavior.
---

# Developer Senior

## Scope

Use for **reviewing implementation** produced under [developer-backend](../developer-backend/SKILL.md), [developer-database](../developer-database/SKILL.md), [developer-frontend-ui](../developer-frontend-ui/SKILL.md), and [developer-frontend-data-sync](../developer-frontend-data-sync/SKILL.md). For **whether the technical spec and stack fit the product** and **engineering coordination**, use [developer-manager](../developer-manager/SKILL.md).

Anchor reviews to `docs/product-requirements-v1.md`, `docs/technical-design-v1.md`, and `docs/tech-stack.md` so behavior matches intent.

## Backend review (API / server)

- **Validation and errors**: Inputs validated (e.g. Zod); error shapes consistent and safe to expose.
- **Authn/authz**: Session or caller identity respected; **ownership and authorization before every mutation**; no IDOR-style gaps.
- **Transactions**: Multi-step state changes use transactions; partial failure modes considered.
- **Realtime**: SSE fan-out scoped to the right subscribers; lifecycle and backpressure reasonable.
- **Logging**: Structured logging (e.g. pino) with **request correlation** (`request_id`); no secrets or PII in logs.
- **Tests**: Route and service behavior covered for new or changed paths.

## Database review (schema / queries / migrations)

- **Integrity**: Foreign keys, constraints, and IDs (UUID v7 / ULID per stack) used appropriately; no silent denormalization without a documented reason.
- **Migrations**: Prefer **additive, deploy-order-safe** changes; risky migrations have rollback or operational notes.
- **Queries**: Indexes match real filter/sort paths; watch N+1 and hot paths; use transactions for multi-write flows.
- **Auditing**: Ownership, membership, and invite-related changes remain traceable where the product requires it.
- **Tests**: Migration or query changes justified with tests or documented verification where applicable.

## Frontend review — UI ([developer-frontend-ui](../developer-frontend-ui/SKILL.md))

- **Accessibility**: Modals/focus traps, **Escape**, and **T3** outside-click semantics (pending vs decline) match wireframe/product rules.
- **Forms**: Zod rules align with API (**Unicode code-point** limits, shared schemas when they exist); inline errors and remaining-count UX where required.
- **Toasts**: Single provider, **max visible cap + queue**; no duplicate providers per route.
- **Routing**: Deep links and registered routes match TDD (e.g. **T4**, **N1**, **A3**, notification links as defined).
- **Tests**: RTL uses accessible queries; Playwright coverage for keyboard paths and critical flows when behavior changes.

## Frontend review — data & sync ([developer-frontend-data-sync](../developer-frontend-data-sync/SKILL.md))

- **TanStack Query**: Correct **invalidation** after mutations (lists, list detail, pending invites, etc.); refetch/focus behavior appropriate when SSE may be flaky.
- **SSE**: **One `EventSource` per open sync list**; **closed on unmount / navigation / `listId` change**; updates reconcile with cache (patch or targeted invalidation).
- **Contracts**: Zod (and types) **match the API**; shared packages preferred for cross-app rules.
- **Mutations**: Optimistic patterns only where allowed (e.g. toggle/add); deletes stay pessimistic or confirm-first per product rules.
- **Tests**: Hooks or integration points tested with mocked Query client where useful; E2E coordination for SSE-visible UI when needed.

## Cross-cutting (any layer)

- **Security**: Input boundaries, session cookies, CSRF/SameSite posture—use [developer-security](../developer-security/SKILL.md) when auth or sensitive data is in play.
- **Shared contracts**: Prefer `packages/shared` for types/schemas used by both apps; no duplicated magic numbers for limits.
- **Quality gates**: Respect `AGENTS.md` coverage and **regression tests for bug fixes** (fail before, pass after).
- **Observability**: Meaningful logs/metrics for new failure modes; not deferred to “later.”

## Review output

- Call out **severity** (must-fix vs should-fix vs nit) and **file/region** when possible.
- Separate **product/design questions** (escalate or doc) from **implementation defects**.

## Delivery checklist (before approval)

- Backend: validation, authz, transactions, SSE scope, logging, tests for changed behavior.
- Database: constraints, migration safety, indexes/transactions, audit needs, verification.
- Frontend UI: a11y/dialog rules, form/toast/routing checklist items touched by the change.
- Frontend sync: invalidation, SSE lifecycle, Zod/API parity, mutation strategy.
- Cross-cutting: shared contracts, security touchpoints, coverage and regression tests as required.
