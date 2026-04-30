# Multi-list web app — technology stack

## Document control

| Field | Value |
| --- | --- |
| **Status** | v1.22 |
| **Last updated** | 2026-04-30 |
| **Related** | [product-requirements.md](product-requirements.md) v0.29; [technical-design.md](technical-design.md) v0.25; [design-wireframe.md](design-wireframe.md) v0.50; [development-plan.md](development-plan.md) v1.15; [status.md](status.md); [infrastructure.md](infrastructure.md); **v1.1:** [product-requirements-v1.1.md](product-requirements-v1.1.md) v0.7, [technical-design-v1.1.md](technical-design-v1.1.md) v0.28, [development-plan-v1.1.md](development-plan-v1.1.md) v0.23, [release-notes-v1.1.md](release-notes-v1.1.md) |

This document records **implementation technology** choices aligned with the PRD and technical design. Architecture, APIs, and data model remain authoritative in **technical-design.md** (MVP) and **technical-design-v1.1.md** for the v1.1 release.

**Engineering bar:** Repo-wide expectations for **automated test coverage** (typically **≥ 80%** lines/statements per [`AGENTS.md`](../AGENTS.md)), **secure implementation** (this doc’s auth rows + **[`technical-design.md`](technical-design.md)** §7 + [.cursor/skills/developer-security/SKILL.md](../.cursor/skills/developer-security/SKILL.md)), and **layered review** ([.cursor/skills/developer-code-quality/SKILL.md](../.cursor/skills/developer-code-quality/SKILL.md), [.cursor/skills/developer-senior/SKILL.md](../.cursor/skills/developer-senior/SKILL.md), [.cursor/skills/developer-quality-assurance/SKILL.md](../.cursor/skills/developer-quality-assurance/SKILL.md) per [development-plan.md](development-plan.md)) apply to all stacks below.

---

## Locked decisions

| Area | Choice |
| --- | --- |
| **Languages** | **TypeScript** on both **client** and **server** (backend is not Go or another runtime for MVP). |
| **Datastore** | **PostgreSQL** — system of record (see TDD ADR-001). |
| **Auth (MVP)** | **Magic links** over email; session after link consumption — **httpOnly** `lists_session`, **SameSite=Lax`, **Secure** when `COOKIE_SECURE=true`; **30-day** session TTL ([technical-design.md](technical-design.md) section 7, `apps/api/src/auth/cookie.ts`, `apps/api/src/auth/session-ttl.ts`). |
| **Auth (post-MVP / v1.1)** | **Password** sign-in for **returning** users; **magic link** for **first-time** login. **v1.1:** **Argon2id** (locked — not bcrypt or other Argon2 variants) for password hashes; reset email; rate limits — [technical-design-v1.1.md](technical-design-v1.1.md) §3. MVP codebase may still be magic-only until v1.1 ships. |
| **CSV import (v1.1)** | Server-side parse (library **TBD** in implementation); UTF-8; limits per [technical-design-v1.1.md](technical-design-v1.1.md) §5–§6; user-selectable **first row = header or data** (**FR-V11-I09**); **exact-dedupe skip** + **similar** row resolution (**Levenshtein** heuristic in TDD). |
| **Image `alt` (v1.1)** | **`original_filename`** from upload (sanitized), stored on **`item_attachments`** — [technical-design-v1.1.md](technical-design-v1.1.md) §4.4 / §7.5. |
| **Object storage (v1.1)** | S3-compatible bucket for **full + thumbnail** image objects; metadata in PostgreSQL — [technical-design-v1.1.md](technical-design-v1.1.md) §7. |
| **Image processing (v1.1)** | **sharp** (or equivalent) generates **persisted thumbnail** on upload; **no** mandatory full-file recompression — [technical-design-v1.1.md](technical-design-v1.1.md) §7. |
| **Realtime (MVP)** | **Server-Sent Events (SSE)** for sync-list pushes; **REST** for mutations. Fallback: refetch on focus, pull-to-refresh, optional short poll (TDD §12). |
| **HTTP framework (API)** | **Fastify** | Implemented in `apps/api`; REST + SSE-friendly. |

---

## Frontend (browser)

| Layer | Recommendation | Notes |
| --- | --- | --- |
| **Runtime** | **TypeScript** | Shared mental model with API. |
| **UI library** | **React** | Responsive app shell, modals, drawers, toasts (wireframes). |
| **Build** | **Vite** | Fast dev; SPA is sufficient for MVP (API on same or separate origin). |
| **PWA (v1.1+)** | **Manifest + minimal SW** | `site.webmanifest` + icons; pass-through `sw.js` registered **in production only** (Chromium install criteria). **Install App** (`beforeinstallprompt`) and iOS **Add to Home Screen** helper dialog — [development-plan-v1.1.md](development-plan-v1.1.md) **Prompt 11**; **offline**/**push** deferred. |
| **Routing** | **React Router** or **TanStack Router** | Deep links for invites, lists, auth callback. |
| **Server state** | **TanStack Query** | Caching, refetch-on-window-focus for sync freshness when SSE is flaky. |
| **Realtime client** | **Native `EventSource`** | Consumes SSE; no mandatory extra dependency. |
| **A11y / headless primitives** | **Radix UI** and/or **React Aria** | Dialogs, focus, **NFR-04** alignment. |
| **Validation (shared)** | **Zod** (or equivalent) | Can mirror API rules for list/item Unicode length, etc. |
| **Toasts / stack (wireframes)** | **Sonner** or **Radix UI Toast** | Single app-wide provider; enforce **4 visible max** + queue (see [design-wireframe.md](design-wireframe.md) — *Design risks the TDD makes more real*). |

### Frontend ↔ wireframes (implementation)

- **TanStack Query:** Use **`refetchOnWindowFocus`** (and optional short **`refetchInterval`** while **L1** sync list is mounted) to match TDD fallback when **SSE** is down or flaky; invalidate **`['lists']`**, **`['list', id]`**, **`['invites','pending']`** after successful mutations so **M1** / **T4** / **FR-S16** stay consistent.
- **SSE:** **`EventSource`** per open sync list; close on navigate away to avoid leaks; on message, **patch** or **invalidate** the active list query so **FR-S15** title and items update without full reload.
- **Radix / React Aria:** Use for **T1–T4**, **M2**, **FR-L09** (**T3**) — focus trap + Escape per wireframe *Accessibility*; implement **T3** as a distinct variant (outside click = pending, not declined).
- **Zod + UI:** Share max **Unicode code-point** rules with the API; surface **remaining count** near list-name / item fields when approaching **50** (wireframe *Implementation alignment*).
- **Optimistic updates (optional MVP+):** **`useMutation` `onMutate`** safe for **toggle done** / **add item**; keep **delete item** and **list delete** **pessimistic** or confirm-first (no item undo).
- **Routing:** **React Router** or **TanStack Router** — register routes for **T4**, **N1**, magic-link **A3** callback, deep links from notifications (**TBD**).

### Frontend testing

| Layer | Tool |
| --- | --- |
| **Unit / component** | **Vitest** + **Testing Library** |
| **E2E** | **Playwright** (TDD §11) — keyboard paths **L1** / **T3** / **T4** (**NFR-04**); **S0 → T4** with zero lists; toast stack **4** (smoke). **v1.1:** **`@axe-core/playwright`** scans **`/login`** (full page) + **`.l1`** on mocked list detail (`e2e/a11y.spec.ts`, WCAG 2.0/2.1 A+AA tags; sidebar excluded per v1.1 TDD §10). PR CI runs desktop **Chromium** plus mobile smoke on **Android Chrome emulation** (`Pixel 7`) and **iPhone Safari/WebKit emulation** (`iPhone 14`) in `apps/web/e2e`. |

Testing depth, quality gates, and regression scope are defined in [technical-design.md](technical-design.md) v0.24 §11 and operationalized in [development-plan.md](development-plan.md) v1.13 §9–§10.

---

## Backend (API)

| Layer | Recommendation | Notes |
| --- | --- | --- |
| **Runtime** | **Node.js** + **TypeScript** | Single language with frontend; optional shared package for schemas/types. |
| **HTTP framework** | **Fastify** | Locked for MVP (`apps/api`); Hono not in use. |
| **Database access** | **Drizzle ORM** or **Prisma** | Migrations; PostgreSQL FKs and transactions for invite accept, duplicate copy, **FR-S14**. |
| **Request validation** | **Zod** (or framework-native schema) | Align with PRD Unicode/code-point limits and enums. |
| **Logging** | **pino** (Fastify default) | Structured logs with `request_id` (echoed/generated from `x-request-id`). **v1.1:** standardized failure-log helper (`apps/api/src/observability/failure-log.ts`) emits `warn`-level events `{ scope, event, outcome, status, userId?, listId?, itemId? }` for **auth**, **import**, and **media** flows; secrets (passwords, magic-link/reset tokens, raw image bytes, login email) are never logged — [technical-design-v1.1.md](technical-design-v1.1.md) §9 / **NFR-V11-04**. |
| **Deploy health** | **`GET /health`** (typical) | **Railway** and similar hosts use an **HTTP health check** on the API—set **Healthcheck Path** to the route documented in [technical-design.md](technical-design.md) §6.1 (**unauthenticated** **`2xx`**, liveness vs readiness spelled out there). |

### Backend responsibilities (unchanged from TDD)

- Single logical service owning mutations, authz, audit (**NFR-08**), and SSE fan-out for open sync lists.
- Optional **worker / scheduler** later for bounded invite-expiry or purge jobs (TDD §5.3, §5.6); correctness may stay lazy-on-read initially.

---

## Data & infrastructure

| Component | Choice |
| --- | --- |
| **Database** | **PostgreSQL** (managed: e.g. Neon, Supabase, RDS — pick one for environment). |
| **IDs** | **UUID v7** or **ULID** (TDD — sortable, non-guessable). |
| **App hosting** | **Fly.io**, **Railway**, **Render**, or similar — long-lived process friendly for **SSE**. |
| **API container** | Repo-root **`Dockerfile`** builds **`@lists/api`**; run migrations locally with `npm run db:migrate -w @lists/api`, in CI via **Actions → [Database migrate](../.github/workflows/migrate.yml)** (after secrets and workspaces exist), or add automatic migrate on `main` per [infrastructure.md](infrastructure.md) §3. |
| **Web container** | Repo-root **`Dockerfile.web`** builds `@lists/web` (Vite production build + static **`serve`** on port **4173**). On Railway, set **`VITE_API_URL`** as a **Docker build argument** so the API origin is inlined at build time — [development-plan.md](development-plan.md) §14.2 prompt **14**. |
| **TLS** | **HTTPS** everywhere (**NFR-01**); HSTS per ops decision (TDD TBD). |

---

## External services

| Service | Role | Notes |
| --- | --- | --- |
| **Transactional email** | Magic-link, **password-reset**, and **list-invite** delivery | **Resend**, **Postmark**, or **Amazon SES** via `EMAIL_PROVIDER`. Shared pipeline: `apps/api/src/email/send-transactional.ts` (used by `auth/mailer.ts`, invite outbox). **Invites:** rows in `email_outbox`, migration **0007**, accept link **`/app/invites/accept?token=`** — [technical-design-v1.1.md](technical-design-v1.1.md) **§9A**, **FR-V11-S01**. Optional subject override `INVITE_EMAIL_SUBJECT`; background retries via `EMAIL_OUTBOX_TICK_MS`. SPF/DKIM/DMARC — [email-deliverability.md](email-deliverability.md). |

---

## Explicitly out of scope for MVP (stack)

- Native mobile apps (PRD non-goals).
- **WebSocket** as default realtime (reserve if SSE proves insufficient).
- **GraphQL** (REST + SSE matches TDD).
- Product-mandated API rate limits (PRD); infra-level limits optional later.
- **Password** auth and password-reset email — **v1.1** ([product-requirements-v1.1.md](product-requirements-v1.1.md)); MVP may remain **magic-link-only** until that release. **Offline** **local** persistence (**FR-OF01**–**FR-OF03**) remains **post-MVP**; MVP/v1.1 stay **online-only** for client sync semantics.

---

## Developer skill map

Use these project skills to keep implementation aligned with this stack:

| Area | Skill path |
| --- | --- |
| Frontend UI (routes, dialogs, forms, toasts, a11y, UI tests) | `.cursor/skills/developer-frontend-ui/SKILL.md` |
| Frontend data & realtime sync (TanStack Query, SSE, invalidation, Zod contracts) | `.cursor/skills/developer-frontend-data-sync/SKILL.md` |
| Backend API (REST/SSE, auth/session, validation, logging) | `.cursor/skills/developer-backend/SKILL.md` |
| Database (PostgreSQL schema, migrations, constraints, indexes) | `.cursor/skills/developer-database/SKILL.md` |
| Unit/component test implementation | `.cursor/skills/developer-unit-testing/SKILL.md` |
| Structural code quality (pre-review pass) | `.cursor/skills/developer-code-quality/SKILL.md` |
| Senior review (correctness, contracts, security) | `.cursor/skills/developer-senior/SKILL.md` |
| Test execution (background runs, monitoring, abort handling) | `.cursor/skills/developer-testing/SKILL.md` |
| QA and E2E validation | `.cursor/skills/developer-quality-assurance/SKILL.md` |
| Security review and hardening | `.cursor/skills/developer-security/SKILL.md` |
| Delivery planning and coordination | `.cursor/skills/developer-manager/SKILL.md` |

---

## Revision history

| Date | Change |
| --- | --- |
| 2026-04-30 | **v1.22:** Data & infrastructure API row — links **`migrate.yml`** (manual dispatch) + [infrastructure.md](infrastructure.md) §3. |
| 2026-04-30 | **v1.21:** Backend **Deploy health** row — **`GET /health`**, Railway **Healthcheck Path** aligned with TDD §6.1. |
| 2026-04-30 | **v1.20:** **Engineering bar** paragraph after intro — links **`AGENTS.md`** coverage expectations, security (TDD §7 + **developer-security**), and layered review skills (code-quality, senior, QA) per development plan; skill map rows for **developer-code-quality** and **developer-senior**. |
| 2026-04-22 | **v1.19:** E2E row + doc control: CI now runs Playwright mobile smoke (`mobile-chrome`, `mobile-safari`) in addition to desktop Chromium; related-doc pointers bumped to PRD v0.29 / TDD v0.25 / dev plan v1.15. |
| 2026-03-25 | Initial stack: TypeScript full stack, PostgreSQL, magic links, SSE, tooling as above. |
| 2026-03-25 | Frontend ↔ wireframes: Query invalidation/SSE/toast provider/Zod UI hints/Playwright scenarios; linked design-wireframe v0.45 |
| 2026-03-26 | Added developer skill map and updated frontend skill names to `developer-frontend-ui` and `developer-frontend-data-sync`. |
| 2026-03-26 | Added links to the expanded testing strategy and quality gates in TDD and development plan docs. |
| 2026-03-27 | Locked **Fastify** for the API; linked [status.md](status.md); bumped doc version to **v1.1**. |
| 2026-03-30 | Auth row: magic-link session cookie details aligned with **technical-design** §7 (implementation in `apps/api`). |
| 2026-04-01 | Added `developer-testing` skill to developer skill map (background test execution, monitoring, abort handling). |
| 2026-04-16 | E2E row: PR CI runs Playwright **Chromium** only; regression specs live in `apps/web/e2e`. |
| 2026-04-16 | **Data & infrastructure:** API `Dockerfile` + migrate workflow; [email-deliverability.md](email-deliverability.md) for SPF/DKIM/DMARC; transactional providers per `EMAIL_PROVIDER`. |
| 2026-04-17 | Document control: aligned cross-links to PRD v0.27, TDD v0.17, wireframes v0.49, development-plan v1.10; bumped **Status** to v1.6. |
| 2026-04-17 | **v1.1:** Linked PRD/TDD/dev-plan; added stack rows for password (Argon2id), CSV import, S3-compatible images; clarified out-of-scope vs v1.1; bumped **Status** to v1.7. |
| 2026-04-17 | **v1.1:** Object storage row covers **full + thumbnail**; added **Image processing (v1.1)** (**sharp**); PRD v0.2 limits + thumbnails. |
| 2026-04-17 | **v1.1:** CSV import row — **dedupe** + **similar** resolution; **`alt`** = **filename**; PRD v0.3. |
| 2026-04-17 | **v1.8:** **Argon2id** for v1.1 passwords **locked** in stack row; TDD v1.1 **v0.5** pointer. |
| 2026-04-17 | **v1.9:** CSV import row — **first row** header vs data (**FR-V11-I09**); PRD **v0.5** / TDD **v0.6** pointers. |
| 2026-04-17 | Document control: MVP TDD **v0.20**; **technical-design-v1.1** **v0.7** (import similar-row tuning — dev plan **§13.1**). |
| 2026-04-17 | Document control: MVP TDD **v0.21**; **v1.1** PRD **v0.6** / TDD **v0.8** — **v1.1.0** similar import rules **locked** (Levenshtein ≤ 2, min length 2, no JW). |
| 2026-04-17 | **v1.10:** [development-plan.md](development-plan.md) **v1.11** — **`Dockerfile.web`** + **`VITE_API_URL`** build-arg on Railway; doc control link bump. |
| 2026-04-17 | **v1.11:** Linked [infrastructure.md](infrastructure.md) (provider map; no secrets); doc control **Status** bump. |
| 2026-04-17 | **v1.12:** Auth row — **30-day** session TTL; pointers to MVP TDD **v0.22** + v1.1 TDD **v0.19** (`session-ttl.ts`). |
| 2026-04-17 | **v1.13:** Backend logging row — v1.1 structured failure-log helper (`observability/failure-log.ts`), no-secrets guarantee; linked v1.1 TDD **v0.25** §9 / dev-plan **v0.20** / [release-notes-v1.1.md](release-notes-v1.1.md) **v0.1** (dev-plan **§7** prompt 9 completed). |
| 2026-04-17 | **v1.14:** **Transactional email** row — **invite** outbox + shared `send-transactional`; PRD **v0.28** / **v0.7**, MVP TDD **v0.23**, v1.1 TDD **v0.24**, dev-plan v1.1 **v0.19**. |
| 2026-04-17 | **v1.15:** Doc control — [design-wireframe.md](design-wireframe.md) **v0.50** (N1 vs **FR-V11-S01** invite mail); [development-plan.md](development-plan.md) **v1.12** pointer. |
| 2026-04-17 | **v1.16:** MVP [technical-design.md](technical-design.md) **v0.24** (email staging guidance under **§11.3**); related-doc row + testing pointer. |
| 2026-04-18 | **v1.17:** Frontend **PWA (v1.1+)** row — manifest, prod-only pass-through SW, Prompt **11** install UX; doc control links to v1.1 TDD **v0.27** / dev-plan **v0.22**. |
| 2026-04-18 | **v1.18:** E2E row — **`@axe-core/playwright`** for WCAG **A+AA** smoke on login + list detail; v1.1 TDD **v0.28** / dev-plan **v0.23**. |
| 2026-03-31 | **Post-MVP** auth row (password + first-login magic); MVP out-of-scope note for passwords + **FR-OF01**–**FR-OF03** local persistence; PRD v0.24 / TDD v0.11 alignment. |
