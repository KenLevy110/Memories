# 4List web app — development plan

## 1. Document control


| Field   | Value                           |
| ------- | ------------------------------- |
| Title   | List web app — development plan |
| Version | 1.15                            |
| Author  | Ken Levy                        |
| Date    | 2026-04-22                      |
| Status  | Draft                           |


## 2. Linked inputs


| Artifact                      | Location                                                 |
| ----------------------------- | -------------------------------------------------------- |
| PRD                           | [product-requirements.md](product-requirements.md) v0.28 |
| Wireframes                    | [design-wireframe.md](design-wireframe.md) v0.50         |
| Technical design              | [technical-design.md](technical-design.md) v0.24         |
| Tech stack                    | [tech-stack.md](tech-stack.md) v1.16                      |
| Execution status (living log) | [status.md](status.md)                                   |
| Implementation log            | [implementation-log.md](implementation-log.md)           |
| Runbook                       | [runbook.md](runbook.md)                                 |
| ADR index                     | [adr/README.md](adr/README.md)                           |
| This plan (canonical path)    | [development-plan.md](development-plan.md)               |
| PRD skill (IDs / structure)   | `.cursor/skills/product-manager/`                        |
| Development-planner skill (authoring) | `.cursor/skills/development-planner/`            |
| Technical design skill        | `.cursor/skills/technical-designer/`                     |
| Designer-wireframe skill      | `.cursor/skills/designer-wireframe/`                     |
| Developer manager skill       | `.cursor/skills/developer-manager/`                      |
| Frontend UI skill             | `.cursor/skills/developer-frontend-ui/`                  |
| Frontend data & sync skill    | `.cursor/skills/developer-frontend-data-sync/`           |
| Backend API skill             | `.cursor/skills/developer-backend/`                      |
| Database skill                | `.cursor/skills/developer-database/`                     |
| Security skill                | `.cursor/skills/developer-security/`                     |
| Unit test skill               | `.cursor/skills/developer-unit-testing/`                 |
| QA skill                      | `.cursor/skills/developer-quality-assurance/`            |
| Testing execution skill       | `.cursor/skills/developer-testing/`                      |
| Senior review skill           | `.cursor/skills/developer-senior/`                       |


## 3. Executive summary

- **Delivery goal:** Ship an MVP responsive web app with magic-link auth, unlimited lists and items, duplicate/sync sharing with invites and roles, in-app notifications, list delete with server-backed 30s undo, and SSE (or documented fallbacks) for sync freshness — aligned with the PRD, wireframes, and TDD.
- **Time horizon:** April 17, 2026 (as of this plan revision)
- **Key outcomes:**
  - End-to-end auth and list library → active list (**A1–A3**, **S0**, **M1**, **L1**, **M2**).
  - Items and sort modes (**FR-I01–FR-I05**, **FR-O01–FR-O05**) with accessible core UI (**NFR-04**).
  - Share flow, pending invites, collision dialog, accept/decline (**T2–T4**, **FR-S01**–**FR-S16**, **FR-L09**).
  - Participants, leave/remove, succession correctness on server (**P1**, **FR-S07**–**FR-S14**).
  - Notifications + bell + mark-all-read (**N1**, **FR-S10**); invite discovery toasts with stack rules (**FR-S16**, wireframe P0).
  - Realtime path for sync lists per TDD (**SSE**) with focus refetch / optional poll fallback documented in release notes if SSE slips.

## 4. Scope of this plan


| In scope (this plan)                                    | Out of scope (MVP — unchanged from PRD/TDD)                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Full-stack TS MVP per [tech-stack.md](tech-stack.md)    | Native apps; offline **FR-OF01**–**FR-OF03** — **post-MVP** (PRD); MVP stays **online-only**          |
| PostgreSQL schema, migrations, transactional logic      | Product API rate limits                                                                               |
| REST API sketch in TDD §6 (+ naming finalization)       | Email/SMS/push notifications (**NFR-06**)                                                             |
| Responsive UI per wireframes (side nav + mobile drawer) | **MVP unchanged:** no password auth. **Post-MVP:** password sign-in + magic link **first login only** |
| SSE for sync updates + client fallbacks                 | WebSocket as default                                                                                  |
| Vitest/RTL + Playwright critical paths                  | Separate support console UI (**NFR-08** = admin API only)                                             |
| Deployable app + transactional email for magic links    | Formal numeric SLOs (**TBD** in TDD)                                                                  |


## 5. Missing inputs & assumptions

**Gaps (mark TBD in execution):** Team size, sprint length, hard release date, exact cookie/SameSite/CSRF strategy, ID type (UUID v7 vs ULID), ORM choice (Drizzle vs Prisma), client router (React Router vs TanStack Router).

**Resolved in repo (do not re-litigate without ADR):** HTTP API framework **Fastify** — see [tech-stack.md](tech-stack.md) and `apps/api`.

### 5.1 Execution status & traceability hygiene

- **Living status:** Update [status.md](status.md) at milestone boundaries with active milestone, top blockers, last known green `main`, and imminent vendor decisions.
- **Milestone close-out:** Before closing a milestone, skim **FR/NFR IDs ↔ implemented routes or UI ↔ automated tests** so this plan and code stay aligned.

**Assumptions for sequencing:**

- **Team / capacity:** **Assumption** — 1–2 engineers full-stack or parallel FE/BE after API contract is stubbed.
- **Process:** Milestone-based increments that are **demoable** (auth → lists → items → share → notifications → realtime polish).
- **Technical:** Stack locked as in [tech-stack.md](tech-stack.md); API shapes follow [technical-design.md](technical-design.md) §6 (names like `restore` vs `undelete` finalized in implementation).
- **Product:** Short PRD + wireframes are authoritative for MVP behavior; conflicts are resolved by explicit issue (e.g. PRD "trap focus" vs WCAG modals — wireframe §Global patterns).

### 5.2 Post-MVP product releases (not this MVP)

Documented in [product-requirements.md](product-requirements.md) and [technical-design.md](technical-design.md); **no** change to MVP sequencing (**W4**, **M1**, etc.) unless explicitly rescoped.

1. **Authentication:** **Password** for **returning** users; **magic link** for **first-time** login only (and **TBD** recovery flows).
2. **Offline / local persistence:** **FR-OF01**–**FR-OF03** — **local** durable copy on device for offline use; **server** remains **system of record** when online (reconciliation per PRD).

## 6. Assumptions & constraints

- **HTTPS** everywhere (**NFR-01**); session cookies httpOnly — details **TBD** §7 TDD.
- **WCAG 2.2 AA–oriented** core flows: Radix/React Aria, focus into standard dialogs; **T3** (**FR-L09**) is a **variant** (outside click / Escape → pending, not declined).
- **Invite expiry:** lazy transition on read (**FR-S05**); optional cron later.
- **List delete:** soft tombstone + **30s** restore + purge after window (**FR-L08**, TDD §5.6); undo **toast-only** in UI for MVP.
- **Estimates:** T-shirt **S/M/L** only; no hour estimates (velocity not provided).

## 7. Work breakdown

### 7.1 Epics (initiatives)


| ID  | Epic                  | Goal                                              | FR/NFR refs                                    | Notes                                     |
| --- | --------------------- | ------------------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| E1  | Foundation            | Repo, tooling, shared types, CI smoke             | NFR-01, NFR-05 (prep)                          | `apps/web`, `apps/api`, `packages/shared` |
| E2  | Data & auth           | Schema, migrations, magic link + session          | NFR-02, NFR-05, NFR-08 prep                    | §5 TDD entities                           |
| E3  | Lists & library       | CRUD, soft delete/restore, M1/L1/S0 shell         | FR-L01–FR-L08, FR-L10, FR-L11                  | §6 list APIs                              |
| E4  | Items & order         | Items CRUD, order modes, L1 complete              | FR-I01–FR-I05, FR-O01–FR-O05                   | §5.2 ordering                             |
| E5  | Sharing & invites     | Batch invites, pending, accept/decline, collision | FR-S01, FR-S05, FR-S06, FR-S11, FR-L09, FR-S16 | Transactions + ADR-002                    |
| E6  | Sync membership       | Roster, remove, leave, succession                 | FR-S02–S04, FR-S07–S09, FR-S12–S14             | §6.1 leave vs delete                      |
| E7  | Notifications         | Sharer feed, read/mark-all, bell badge            | FR-S10                                         | `POST /notifications/read-all`            |
| E8  | Realtime & freshness  | SSE fan-out + client subscription + fallbacks     | FR-S02, FR-S15                                 | TDD §12 mitigations                       |
| E9  | App shell & UX polish | Nav, toasts (4-cap), FR-S16, a11y, errors         | NFR-04, FR-S16                                 | Wireframe P0 items                        |
| E10 | Quality & rollout     | Tests, deploy, email DNS, logging/metrics         | NFR-01, TDD §9–11                              | Playwright in tech-stack                  |


### 7.2 Work items


| ID  | Title                                                                                                         | Type    | Epic | Deps         | FR/NFR                      | Wire          | TDD                |
| --- | ------------------------------------------------------------------------------------------------------------- | ------- | ---- | ------------ | --------------------------- | ------------- | ------------------ |
| W1  | Bootstrap monorepo: Vite+React+TS, Node+TS API, lint, env                                                     | chore   | E1   | —            | —                           | —             | §4.1               |
| W2  | PostgreSQL + migrations; users, lists, items, memberships, invites, notifications, audit                      | feature | E2   | W1           | FR-L03–L05, FR-S14          | —             | §5.1, §5.6         |
| W3  | Zod (shared): Unicode code-point limits, enums; export FE+BE                                                  | chore   | E1   | W1           | FR-L04, FR-I02              | M2, L1        | §5                 |
| W4  | Auth: magic link request/consume, session cookie, logout; A1–A3                                               | feature | E2   | W2, W3       | NFR-05                      | A1–A3         | §6 Auth            |
| W5  | Lists API: CRUD + restore; soft-delete; derived Private/Shared                                                | feature | E3   | W4           | FR-L01–L08, L10, L11        | M1–M3, T1     | §6 Lists, §5.6     |
| W6  | App shell: side nav M1 + mobile drawer, header (bell, account)                                                | feature | E3   | W4           | NFR-03, NFR-04              | App shell     | §4.1               |
| W7  | Library UI: M1 rows, S0, M2/M3/rename, T1 + undo toast (minimal host; full in W17)                            | feature | E3   | W5, W6       | FR-L07, FR-L08              | S0, M1–M3, T1 | §6.1               |
| W8  | Items API + order endpoint; sort_key / mode persistence                                                       | feature | E4   | W5           | FR-I01–I05, FR-O01–O05      | L1            | §5.2, §6 Items     |
| W9  | L1 UI: add/toggle/delete items, empty state, sort, optimistic add/toggle                                      | feature | E4   | W7, W8       | FR-I03, FR-O02              | L1            | tech-stack         |
| W10 | Invites API: batch POST, GET pending, accept (collision), decline; lazy expiry                                | feature | E5   | W5           | FR-S05, S06, FR-L09, FR-S01 | T2, T4, T3    | §5.3, §6 Sharing   |
| W11 | Share UI T2 + pending T4 + collision T3 (focus); INV nav + badge                                              | feature | E5   | W10          | FR-S12, S13, S16            | T2–T4, INV    | §6, ADR-002        |
| W12 | Sync membership: remove, leave, copy-on-leave, succession, account-closure (**FR-S14**)                       | feature | E6   | W10          | FR-S07–S09, FR-S14          | P1, T1 var    | §4.2, §6.1, §10    |
| W13 | P1 participants UI; T1 copy variants (private vs leave); M3 visibility                                        | feature | E6   | W12, W11     | FR-L12                      | P1, M3, T1    | §6.1               |
| W14 | Notifications API: list, PATCH read, POST read-all; N1 + bell badge                                           | feature | E7   | W10          | FR-S10                      | N1            | §6 Notifications   |
| W15 | SSE per sync list; push list/item updates; client EventSource + Query patch                                   | feature | E8   | W8, W12      | FR-S02, FR-S15              | L1            | §4.2, tech-stack   |
| W16 | Fallback freshness: refetchOnWindowFocus, refetchInterval on L1 sync; staleness hint; pull-to-refresh **TBD** | feature | E8   | W15          | FR-S02, NFR-03              | L1            | TDD §12, wireframe |
| W17 | Toast provider: 4-max stack, priority matrix, FR-S16 compact/full; error banner                               | feature | E9   | W6           | FR-S16, NFR-04              | Global        | Wireframe          |
| W18 | Item delete confirm dialog (P0); Zod "remaining chars" on fields                                              | feature | E9   | W9           | FR-I04, FR-L04              | L1, M2        | Wireframe          |
| W19 | Support admin-only endpoints (membership, audit) — no item payload                                            | feature | E10  | W2, W4       | NFR-08                      | —             | §6 Support         |
| W20 | Observability: request_id, structured logs; minimal metrics                                                   | chore   | E10  | W1           | TDD §9                      | —             | §9                 |
| W21 | Vitest+RTL: dialog focus, T3 dismiss; domain unit tests (succession, expiry)                                  | chore   | E10  | W3, W10, W12 | NFR-04                      | T3            | §11                |
| W22 | Playwright: magic link stub, S0→T4, L1 keyboard, toast cap                                                    | chore   | E10  | W7, W11      | NFR-04                      | —             | tech-stack         |
| W23 | Deploy pipeline + managed Postgres; email + SPF/DKIM/DMARC                                                    | chore   | E10  | W4           | NFR-01                      | —             | TDD §12            |


### 7.3 Spikes & proofs of concept


| Spike | Question to answer                                    | Max time | Outcome artifact                             |
| ----- | ----------------------------------------------------- | -------- | -------------------------------------------- |
| SP1   | SSE on Railway (timeouts, proxy buffering, heartbeat) | 2–3 days | ADR or runbook: connection limits, heartbeat |
| SP2   | Cookie auth + CSRF strategy for SPA                   | 1–2 days | Decision in TDD §7 + middleware sketch       |


### 7.4 Definition of done (wireframe- and PRD-aligned)

Use as milestone acceptance checks; trace to [design-wireframe.md](design-wireframe.md) and [product-requirements.md](product-requirements.md).


| Check                                                                                                                     | Source                                            | Owner / gate                                                |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| **S0 → T4 in ≤2 actions** when user has zero lists and ≥1 pending invite (Invites nav / CTA; bell when unread **FR-S10**) | Wireframe S0, Resolved decisions #6               | **M2** (W6–W7) + verify **M4** (INV)                        |
| **Duplicate accept** success feedback: toast stating copy is yours and does not sync with sender                          | Wireframe *Implementation alignment* (**FR-S01**) | **M4** (W11)                                                |
| **T2** one-line recap: mode (Duplicate vs Sync) + invitee count before Send invites                                       | Wireframe *Implementation alignment* / backlog P2 | **P1** timebox in **M4**; if slipped, tracked issue + owner |
| **L1** staleness hint for open sync lists when SSE is off/delayed (e.g. "Updated while you were away" — copy in **W16**)  | Wireframe *Design risks* §4                       | **M7** (W16)                                                |
| **Minimal toast** by **M2**: enough for **FR-L08** undo + errors; **full** 4-cap queue + **FR-S16** rules with **W17**    | §8.1 sequencing                                   | **M2** vs **M6**                                            |
| **Implementation traceability gate:** implementation log updated; ADR created/updated when decisions are architectural/security/contract-level; runbook updated when operator behavior changes | Docs governance + AGENTS                           | Required before milestone close                             |


## 8. Sequencing & milestones

### 8.1 Dependency notes

- **W2 → W4 → W5 → W8 / W10** — schema and auth before list and invite mutations.
- **W5 before W7** — API required for library and undo restore behavior.
- **W10 before W12** — invites/membership share the same domain; accept creates sync membership.
- **W8 + W12 before W15** — SSE payloads assume list+item+membership invariants.
- **W6 early** enables parallel UI work against **mocked API** once OpenAPI or Zod contracts exist (**parallel track**).
- **§6.1:** Implement **DELETE /lists/{id}** + **restore** vs **POST /sync/{id}/leave** without conflating labels in **T1**.
- **Toasts — minimal then full:** Ship a **minimal** app-wide toast host with **W6–W7** (undo **FR-L08**, basic validation/errors). **W11** (**M4**) must not block on the **full** **W17** matrix: use that same minimal host for invite send/collision feedback until **W17** adds **≤4** visible stack, **FR-S16** compact vs full rules, and the wireframe **Notification & toast priority** matrix (**M6**).
- **User-visible auth:** MVP is **magic-link email** only; TDD `POST /auth/register` (or similar) is **implementation naming** if present — no password sign-up in MVP (PRD).

### 8.2 Milestones


| MS  | Outcome (demo / deploy)                                                                                   | Work items            | Target                        |
| --- | --------------------------------------------------------------------------------------------------------- | --------------------- | ----------------------------- |
| M1  | Magic link session (dev/staging), sign out                                                                | W1–W4, SP2 partial    | Sprint 1 **TBD**              |
| M2  | Create/rename/delete list + undo; library + S0 + L1 empty; minimal toast + **§7.4** S0/invite chrome      | W5–W7                 | Sprint 1–2 **TBD**            |
| M3  | Full L1: items + sort modes + item delete confirm                                                         | W8–W9, W18            | Sprint 2 **TBD**              |
| M4  | Share + pending invites + collision + accept/decline + duplicate snapshot (minimal toast; **§7.4** S0/T4) | W10–W11               | Sprint 3 **TBD**              |
| M5  | Participants, leave/remove, correct T1 copy for sync                                                      | W12–W13               | Sprint 3–4 **TBD**            |
| M6  | Notifications + bell + N1 mark-all-read + **full** FR-S16 / toast matrix (**W17**)                        | W14, W17              | Sprint 4 **TBD**              |
| M7  | SSE + freshness fallbacks; production deploy + email                                                      | W15–W16, W20–W23, SP1 | Sprint 4–5 **TBD**            |
| M8  | Hardening: tests, admin support API, a11y sweep                                                           | W19, W21–W22          | Continuous / Sprint 5 **TBD** |


### 8.3 Parallel tracks (optional)


| Track        | Focus                                    | Interfaces with other tracks                                                                                           |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| A — Backend  | W2, W5, W8, W10, W12, W14, W15, W19, W20 | Zod contracts + OpenAPI or shared package for FE                                                                       |
| B — Frontend | W6, W7, W9, W11, W13, W17, W18, W21      | Mocks until W5/W10; then integration. Apply **developer-frontend-ui** + **developer-frontend-data-sync** skills (§14). |
| C — Ops      | W23, SP1, email DNS                      | Needs stable auth + deploy target                                                                                      |


## 9. Testing & quality

### 9.1 Test matrix (execution)


| Area                       | Approach                                                                                                | Owner                             | Linked reqs                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------- |
| Unit (domain + validation) | Succession, lazy expiry, title version, Unicode code-point rules                                        | Dev + unit-tests + testing skills | FR-S14, FR-S05, FR-S15, FR-L04, FR-I02 |
| API + DB integration       | Transactional tests for duplicate accept snapshot, pending semantics, leave/remove                      | Dev + backend/database + testing  | FR-S01, FR-L09, FR-S08                 |
| Component / a11y           | Vitest + RTL for **T3** semantics, dialog focus trap/Escape, field validation UX                        | Dev + frontend-ui + testing       | NFR-04, FR-L09                         |
| FR-L09 tab close           | PRD: tab close without decline → **pending**; browser automation **limited** — document manual coverage | QA + Eng                          | FR-L09                                 |
| E2E critical paths         | Playwright: **S0 → T4**, **L1** keyboard, invite collision retry, toast cap smoke; mobile smoke on Android + iPhone emulation in CI | QA + quality-assurance skill      | FR-S16, NFR-03, NFR-04                 |
| Security / privacy         | Session/cookie validation, per-resource authz, support-route admin gating                               | Security + backend                | NFR-02, NFR-05, NFR-08                 |
| Performance / load         | MVP smoke only; formal SLO testing deferred                                                             | Eng                               | TBD                                    |


### 9.2 Release quality gates


| Gate                | Criteria                                                                                                                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR gate**         | **CI** (`.github/workflows/ci.yml`): `npm run lint`, `npm run typecheck`, `npm run db:migrate -w @lists/api`, `npm run ci:test:full`, Playwright **Chromium** (`npm run test:e2e:ci -w @lists/web`) plus Playwright mobile smoke (`npm run test:e2e:mobile:smoke -w @lists/web`); changed behavior has at least one automated test where practical |
| **Merge-to-main**   | Same as PR gate on `main`; full integration suite plus Playwright regression pack (§9.1). After the `ci` job succeeds, **`.github/workflows/ci.yml`** runs **`migrate-production`**: applies Drizzle migrations to the DB at **`DATABASE_URL_PRODUCTION`** (repo secret). Manual **Database migrations** workflow remains for staging or out-of-band runs (see `docs/infrastructure.md`). |
| **Local fast loop** | Optional: `npm run ci:test:changed` — workspace tests **without** coverage (not a substitute for PR gate)                                                                                                                                                                                   |
| **Pre-release**     | Full Playwright regression; migration rehearsal; security checklist signed off; 0 open P0 defects                                                                                                                                                                                           |
| **Go-live**         | Post-deploy smoke + telemetry (auth, invites, SSE health); rollback plan available                                                                                                                                                                                                          |


### 9.2.1 Coverage thresholds (enforced in CI)


| Metric                                 | Threshold                                                            |
| -------------------------------------- | -------------------------------------------------------------------- |
| Repo-wide statements/lines             | **>= 80%**                                                           |
| Repo-wide branches (policy)            | **>= 70%**                                                           |
| `apps/api` workspace (Vitest) branches | **>= 75%**                                                           |
| `apps/web` workspace (Vitest) branches | **>= 70%**                                                           |
| Critical domain module branches        | **>= 90%** on files matched by `scripts/check-critical-coverage.mjs` |
| Changed files with non-trivial logic   | **>= 80% lines**                                                     |


- `**scripts/check-critical-coverage.mjs`:** Path fragments are defined in that file (currently `apps/api/src/lists/`** and `packages/shared/src/auth/`**). Each matching file in the API/shared coverage summaries must have **>= 90%** branch coverage. If no file matches, the script **passes** and prints a **warning**. Other modules (e.g. invites/membership routes) remain subject to workspace branch floors and integration tests until added to the fragment list.
- Bug-fix PRs must include a failing-then-passing regression test for the defect.
- Any temporary threshold waiver must include owner + expiry date in the PR and be tracked in the next milestone.
- Test placement and naming conventions follow `AGENTS.md` (**Test organization conventions**) and `.cursor/rules/testing-conventions.mdc`.

### 9.3 Initial regression pack (must keep green)

- API + DB: duplicate accept snapshot, **FR-L09** pending semantics, succession edge cases (including **FR-S14** after **account closure** when **W12** hook exists).
- Component: **T3** outside/Escape/Cancel paths, toast queue max 4 behavior.
- E2E: **S0 -> T4** path, **L1** keyboard path, invite collision retry flow.
- Security: non-admin blocked from support API, cross-list authz on mutations.

## 10. Rollout & release


| Step                                                                                    | Owner        | Verification                                                                           |
| --------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------- |
| Provision Railway project/services: `lists-api` and `lists-web` (plus managed Postgres) | Ops          | Staging + production environments created                                              |
| Set canonical URLs and routing for `mylists.life`                                       | Eng/Ops      | API: `https://api.mylists.life` → Railway `lists-api`; Web: `https://www.mylists.life` |
| Keep Railway preview URLs enabled for smoke                                             | Eng/Ops      | API preview: `https://lists-api-<env>.up.railway.app` reachable                        |
| Forward-only DB migrations applied to staging                                           | Eng          | Smoke: auth + list CRUD                                                                |
| Feature flag: SSE on/off (optional)                                                     | Eng          | With SSE off, L1 still updates on focus refetch                                        |
| Regression pack run on release candidate                                                | Eng/QA       | §9.3 pack all green                                                                    |
| Security checklist run on release candidate                                             | Security/Eng | Cookies/session/authz/admin-route checks passed                                        |
| Email provider domain auth (SPF/DKIM/DMARC)                                             | Eng/Ops      | Resend domain verified for `mylists.life`; test magic-link delivery                    |
| Production deploy + HTTPS                                                               | Ops          | `https://www.mylists.life` and `https://api.mylists.life` healthy (**NFR-01**)         |
| Post-deploy: check logs for invite accept errors, SSE connections                       | Eng          | TDD §9 metrics **TBD**                                                                 |
| Rollback: keep previous migration compatibility or freeze writes                        | Eng          | Runbook **TBD**                                                                        |


## 11. Risks & mitigations


| Risk                                 | Likelihood / impact | Mitigation                                              | Owner   |
| ------------------------------------ | ------------------- | ------------------------------------------------------- | ------- |
| SSE unreliable on PaaS               | Med / Med           | Focus refetch + optional poll; UI stale hint; SP1       | Eng     |
| Toast/FR-S16 overload                | Med / Med           | 4-cap queue + priority matrix; nav badge always         | Eng     |
| Accept retry confusion (ADR-002)     | Low / Med           | Inline error + retry from T4; no phantom accepted state | Eng     |
| Email deliverability                 | Med / High          | Transactional vendor + DNS; monitoring (TDD §12)        | Eng/Ops |
| Scope creep (pagination, deep links) | Med / Med           | Defer **TBD** wireframe items after MVP cut line        | PM/Eng  |


## 12. Open engineering questions


| Question                                                         | Blocks                       | Owner         | Target resolution            |
| ---------------------------------------------------------------- | ---------------------------- | ------------- | ---------------------------- |
| `restore` vs `undelete` path naming                              | Low                          | Eng           | Before W5 merge              |
| Sync **leave** — undo copy? (wireframe: likely no)               | UX copy for T1               | Product + Eng | Before W13                   |
| Cookie vs bearer for API                                         | CSRF strategy                | Eng           | SP2                          |
| Pagination for **GET /lists** (**FR-L05**) in MVP?               | M1 at scale                  | Product       | Before large accounts        |
| **Account closure** → **FR-S14** (`closed_at`, hook per TDD §10) | Succession when owners leave | Eng           | With **W12** / **W2** schema |


## 13. Traceability summary


| FR/NFR ID          | Summary                                | Work items               | Wire          | TDD                 |
| ------------------ | -------------------------------------- | ------------------------ | ------------- | ------------------- |
| FR-L01–L08, FR-L10 | Lists lifecycle + undo                 | W5, W7                   | M1–M3, T1, S0 | §5, §6              |
| FR-L11, FR-L12     | Private/Shared + roster                | W5, W13                  | M1, L1, P1    | §4, §6              |
| FR-L09             | Collision + pending                    | W10, W11                 | T3, T4        | §5 Invites, ADR-002 |
| FR-I01–FR-I05      | Items                                  | W8, W9, W18              | L1            | §5 Items            |
| FR-O01–FR-O05      | Order modes                            | W8, W9                   | L1            | §5.2                |
| FR-S01             | Duplicate snapshot / accept            | W10, W11                 | T2, T4        | §5.4, §6            |
| FR-S02             | Sync list; cross-user freshness        | W8, W12, W15, W16        | L1            | §4.2, §12           |
| FR-S05             | Invite rolling expiry                  | W10                      | T4, Help      | §5.3                |
| FR-S06, FR-S11     | Batch invites; independent outcomes    | W10, W11                 | T2, T4        | §5, §6              |
| FR-S07–FR-S09      | Remove, leave, copy naming             | W12, W13                 | P1, T1        | §6.1                |
| FR-S10             | Sharer in-app notifications            | W14                      | N1            | §6                  |
| FR-S12, FR-S13     | User vs Co-owner; reshare              | W10, W11, W13            | T2, P1        | §5, §6              |
| FR-S14             | Succession, owner min, account closure | W12, W2                  | —             | §4.2, §10           |
| FR-S15             | Sync title last-writer-wins            | W5, W8, W15              | L1            | §5                  |
| FR-S16             | Invitee discovery (toast + nav)        | W11, W17                 | INV, Global   | §6, wireframe       |
| NFR-02             | Authz per user/share                   | W4–W5, W8, W10, W12, W19 | —             | §7                  |
| NFR-03             | Responsive mobile + desktop            | W6, W9, W16              | App shell, L1 | TDD §3              |
| NFR-04             | A11y                                   | W6, W11, W17, W21        | Global, T3    | §7                  |
| NFR-05–NFR-06      | Session; no push email                 | W4, W14                  | A1, N1        | §7                  |
| NFR-08             | Support API                            | W19                      | —             | §6 Support          |


---

## 14. Sequenced chat prompts (for incremental implementation)

Use these **in order** in chat with the repo open; each prompt assumes prior steps are merged or on branch. Adjust file paths to match your repo layout after **W1**. Track overall progress against this doc: [development-plan.md](development-plan.md).  

**Testing** When running tests, always follow `@.cursor/skills/developer-testing/SKILL.md` — prefer redirecting output to a temp file and reading results with the Read tool; fall back to background polling only for long-running suites (see the skill for protocol details).

### 14.1 Which Cursor skills to attach

For **client work**, include the right skill(s) in the same message (e.g. `@.cursor/skills/…/SKILL.md`) so implementation matches repo conventions:


| Concern                                                                                                                                                                               | Skill                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Shell, routing, Radix/React Aria dialogs, **T3** outside-click = pending, Zod form UX, toasts (≤4 visible + queue), Vitest+RTL, Playwright                                            | `@.cursor/skills/developer-frontend-ui/SKILL.md` + `reference.md`        |
| TanStack Query keys + invalidation, refetchOnWindowFocus / refetchInterval on L1 sync, EventSource (SSE) lifecycle, optimistic toggle/add vs pessimistic deletes, Zod shared with API | `@.cursor/skills/developer-frontend-data-sync/SKILL.md` + `reference.md` |
| HTTP API shape, validation, transactions, authz on routes                                                                                                                             | `@.cursor/skills/developer-backend/SKILL.md`                             |
| Schema, migrations, constraints, indexes                                                                                                                                              | `@.cursor/skills/developer-database/SKILL.md`                            |
| Sessions, cookies, CSRF/SameSite, admin/support routes                                                                                                                                | `@.cursor/skills/developer-security/SKILL.md`                            |
| Running tests (background execution, polling, abort/hang handling, coverage)                                                                                                          | `@.cursor/skills/developer-testing/SKILL.md`                             |


**Backend-heavy** prompts (2, 4, 8–10, server half of 12, 15): attach **developer-backend** and/or **developer-database** when implementing those layers (**§14.3** suggests when to add senior/QA review).

**Backend-only** prompts (1–2, 4, parts of 3) do not require the frontend skills. **Full-stack** prompts should attach **both** UI and data-sync skills when the change spans UI and server state.

**Auth and support (3, 15):** add `@.cursor/skills/developer-security/SKILL.md` for cookie/session and admin-gating posture (prompt **15** already lists it).

### 14.2 Prompts

1. **Bootstrap:** "Initialize or align the monorepo per `docs/tech-stack.md` and `AGENTS.md`: `apps/web` (Vite+React+TS), `apps/api` (Node+TS, **Fastify**), `packages/shared` with Zod schemas for list/item/invite enums and Unicode code-point limits per PRD. Add ESLint, Prettier, root scripts, and `.env.example`. Do not implement features yet. Wire scripts so `**npm run test`** and `**npm run ci:test:full`** exist at the repo root; run both before merging this step (first run may be minimal smoke until later prompts add suites)."
  1. DONE 2026-03-20 4:45 PM
2. **Database:** "`@.cursor/skills/developer-database/SKILL.md` — From `docs/technical-design.md` §5.1, add PostgreSQL schema and migrations (users with `closed_at` nullable for **FR-S14**, lists with soft delete, items, memberships, invites, notifications, audit). Include `title_version`, invite `expires_at`, and indexes from §8. Use Drizzle or Prisma per `docs/tech-stack.md`."
  1. DONE 2026-03-30 5 PM
  2. DONE Maually reviewed database after AI help to set postgres 2026-03-31 11:30 AM
3. **Auth:** "Implement **magic-link email** auth per TDD §6 (user-visible flow is email only; any `register`-style route names are internal). Endpoints: request, consume (sets session), logout. Use httpOnly cookie; document SameSite/CSRF approach. `@.cursor/skills/developer-security/SKILL.md` `@.cursor/skills/developer-frontend-ui/SKILL.md` — Wire minimal pages **A1–A3** per `docs/design-wireframe.md`; email field (`autocomplete`, validation UX) and routing for **A3** callback."
  1. DONE 2026-03-30 5:10 PM
  2. DONE Tested logging in with help of AI to run api and web in terminal, and determined that I need password for persistent logo 2026-03-31 11:30 AM
  3. DONE Review as senior developer and security expert 2026-03-31 11:49 AM
4. **Lists API:** "`@.cursor/skills/developer-backend/SKILL.md` — Implement list CRUD + `PATCH` title + soft `DELETE` + restore within 30s per TDD §5.6 and §6 (finalize `**restore` vs `undelete`** path per **§12** before merge). Expose derived Private/Shared for library. Align response shapes with Zod types shared with the client."
  1. DONE 2026-03-31 12:15 PM — Canonical restore: `POST /lists/{id}/restore`; TDD §6 lists line updated.
  2. DONE 2026-03-31 Senior review and fixes 12:45 PM
5. **App shell:** "`@.cursor/skills/developer-frontend-ui/SKILL.md` — Build responsive shell per `docs/design-wireframe.md` **App shell**: desktop **M1** side nav + mobile drawer; header with placeholders for notifications and account; routes for library and active list."
  1. DONE 2026-03-31 — Desktop side-nav + mobile Radix drawer; header with notifications/account placeholders; `/app` nested routes for library index and `/app/lists/:listId`; 9 RTL tests.
6. **Library UI:** "`@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — Implement **S0**, **M1**, **M2**, **M3**, rename modal, **T1** for **private** and **duplicate-owned** library lists (`**DELETE /lists/{id}`** + **FR-L08** undo toast calling the restore endpoint; **minimal** app-wide toast host per **§8.1** if not already in prompt 5). **Defer** **sync** **T1** / **M3** **Leave** copy and wiring that call `**POST /sync/{list_id}/leave`** to prompt **9** (TDD §6.1). Invalidate `['lists']` / `['list', id]` per data-sync **reference.md** after list mutations."
  1. DONE 2026-04-01 -- TanStack Query provider + hooks (useListsQuery, useCreateList, useRenameList, useDeleteList, useRestoreList); Sidebar M1 with list rows, visibility labels, navigation; LibraryPage S0 zero-lists state; Create/Rename modals with Zod validation + char count; ListActionsMenu M3; DeleteListDialog T1 with FR-L08 Sonner undo toast + restore; Header shows active list title + actions; Sonner Toaster in App root; 39 RTL tests, all CI gates green.
  2. DONE 2026-04-01 Manually tested creating, renaming and deleting lists and checking in Progres
7. **Items API + L1:** "`@.cursor/skills/developer-backend/SKILL.md` — Items endpoints and order mode per TDD §5.2–§6. Client: `@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — **L1**: add item, toggle done, delete with **confirm** (wireframe P0), sort mode toggle, empty state **FR-L06**; TanStack Query keys and optional optimistic **toggle/add** per data-sync skill; remaining-character hints per UI skill."
  1. DONE 2026-04-01 — Items API: `POST /lists/:id/items`, `PATCH /items/:id`, `DELETE /items/:id`, `GET /lists/:id/items`, `PATCH /lists/:id/order`; item service with authz, sort_key ordering (FR-O04 new items at top in custom), alphabetical vs custom read-time sort. Shared Zod schemas: `createItemBodySchema`, `patchItemBodySchema`, `itemResponseSchema`, `reorderBodySchema`, `listDetailResponseSchema`. L1 UI: add item form with remaining-char hints, toggle done (optimistic), delete with Radix confirm dialog (P0), sort mode radio toggle, empty state (FR-L06); `useListDetailQuery`, `useAddItem` (optimistic), `useToggleItem` (optimistic), `useDeleteItem` (pessimistic/confirm), `useSetOrderMode`. Fixed pre-existing test mock bug (`listsResponse` returning raw array instead of `{ lists: [...] }`). 19 API integration tests + 26 RTL tests; lint + typecheck + all 157 tests green (1 pre-existing mailer test failure unrelated).
  2. DONE 2026-04-01 5 PM - found bug with delete and move item. Fixed.
8. **Invites:** "`@.cursor/skills/developer-backend/SKILL.md` — Invite batch create, pending list, accept with **409** collision payload, decline, lazy expiry **FR-S05**. Client: `@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — **T2** (add one-line mode + invitee recap per wireframe *Implementation alignment* if in scope), **T4**, **T3** with **FR-L09** dismiss semantics (outside/Escape/Cancel → pending); **INV** nav + badge; on successful **duplicate** accept, success toast per **§7.4**; invalidate `['invites','pending']` and related keys on success. **FR-S16** / pending-invite surfaces: **minimal** behavior is OK here (**§8.1**); full compact vs full toast rules, **≤4** visible stack, and wireframe **Notification & toast priority** matrix ship in prompt **11**."
  1. DONE 2026-04-02  — API: `POST /lists/:id/invites`, `GET /invites/pending`, `GET /invites/pending/count`, `POST /invites/:id/accept` (409 collision + rename body), `POST /invites/:id/decline`; lazy expiry on read; `result_list_id` on invites for idempotent duplicate accept. Web: ShareListDialog (T2 recap; invitee rows only under **Invitees**), PendingInvitesPage (T4), CollisionDialog (T3 / FR-L09), sidebar INV + badge, S0 pending CTA; Query invalidation for invites, lists, and list detail; integration + RTL tests. Apply migration `0003`_* before running API tests against Postgres.
  2. DONE 2026-04-02 2:15 PM - Review and fix as senior dev
  3. DONE 2026-04-13 to 14 - Manual testing, several bugs for sharing with users with notificaitons, item similar spelling, etc.
9. **Membership:** "`@.cursor/skills/developer-backend/SKILL.md` — `POST /sync/{list_id}/leave`, remove-member, **FR-S14** succession, and account-closure hook per TDD §10 (**W12**). Client: `@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — **P1** UI; **M3**/**T1** labels match the endpoint invoked; refresh lists/participants after mutations."
  1. DONE 2026-04-14 — API: `POST /sync/:listId/leave` (FR-S03/S04/S08, creates private copy), `POST /sync/:listId/remove-member` (FR-S07 owner-only), `GET /sync/:listId/participants` (roster with roles); FR-S14 succession (earliest accept, PRNG tie-break); account-closure hook removes from all sync lists + runs succession. Shared: `membership-schemas.ts` (participant, leave result, remove body). Web: ParticipantsDialog (P1 with roster, Remove buttons for owners, Leave + Invite actions); LeaveListDialog (T1 sync variant — no undo, navigates to copy); M3 shows "Leave list and keep a copy" vs "Delete list" based on sync/private; L1 participant strip (FR-L12). 9 API integration tests + 10 RTL tests; all 235 tests green.
  2. DONE 2026-04-14 - Manual testing fixes: participants have no space between name and creator or user, share sync is default, re-share a list where a user has left. Not able to fix - when select the menu for a list that is not open, it only opens and the menu item does not show up.
10. **Notifications:** "`@.cursor/skills/developer-backend/SKILL.md` — Notifications list, per-id read, `POST /notifications/read-all`. Client: `@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — **N1**, header bell badge, routes per UI **reference.md**; query/invalidation for unread counts."
  1. DONE - 2026-04-14
11. **Toasts & FR-S16:** "`@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — Complete app-wide toast provider (Sonner or Radix): max 4 visible, queue, priority matrix, compact vs full **FR-S16** rules per `docs/design-wireframe.md` *Notification & toast priority* (replaces **minimal** surfaces from prompts **6**–**8** per **§8.1**). Coordinate with Query/errors so **FR-S16** does not hide critical errors (see wireframe *Design risks*)."
  1. DONE 2026-04-15
12. **SSE:** "Server: `@.cursor/skills/developer-backend/SKILL.md` — SSE fan-out for sync lists (scoped channels, lifecycle). Client: `@.cursor/skills/developer-frontend-data-sync/SKILL.md` — `EventSource` per open sync list; on message, patch or invalidate `['list', id]`; close on unmount / route change / `listId` change. If SSE is off, ensure `refetchOnWindowFocus` and optional `refetchInterval` on **L1** for sync lists per skill; staleness hint copy per **§7.4** / wireframe *Design risks* §4; pull-to-refresh **TBD** per **W16**."
  1. DONE 2026-04-15
13. **Quality:** "`@.cursor/skills/developer-frontend-ui/SKILL.md` `@.cursor/skills/developer-quality-assurance/SKILL.md` — Vitest+RTL: **T3** and standard dialog focus. Playwright: **S0→T4**, **L1**/**T3**/**T4** keyboard paths, toast stack cap; align with **§9.3** regression pack. Backend: structured logging with `request_id` per TDD §9 (**W20**)."
  1. DONE 2026-04-15 — Added RTL coverage for T3 and standard dialog focus/Escape semantics; added Playwright regression suite for S0→T4, keyboard paths, and toast cap; implemented Fastify structured logging with request correlation via `request_id` and response `x-request-id`.
14. **Deploy & email:** "`@.cursor/skills/developer-backend/SKILL.md` — Finalize production deployment on **Railway** using `mylists.life`. Treat this prompt as an incremental checklist on top of existing Docker/migration/email work: do **not** re-create the Dockerfiles or migrate workflow; instead, wire them to Railway. Use repo-root **`Dockerfile`** for `@lists/api` on a **`lists-api`** service. Use repo-root **`Dockerfile.web`** for `@lists/web` on a **`lists-web`** service (multi-stage image: `npm run build -w @lists/web`, then static `serve` on port **4173** per `Dockerfile.web`). Pass **`VITE_API_URL`** as a **Docker build argument** for `lists-web` (Vite inlines `VITE_*` at build time; see `ARG VITE_API_URL` in `Dockerfile.web`). Local smoke before push: `docker build -f Dockerfile -t lists-api:local .` and `docker build -f Dockerfile.web --build-arg VITE_API_URL=https://api.mylists.life -t lists-web:local .`, then `docker run` per comments in each file. Attach managed Postgres and set `DATABASE_URL` per environment (staging, production). Configure canonical domains: Web `https://www.mylists.life`, API `https://api.mylists.life`; keep Railway preview URLs (e.g. `https://lists-api-<env>.up.railway.app`) for smoke only. Ensure CORS and session cookie config allow these origins. Update CI/CD migration workflow to run against Railway Postgres before promoting production. Lock provider to **Resend** for MVP magic-link delivery and complete SPF/DKIM/DMARC checklist in `docs/email-deliverability.md` for `mylists.life`. Add post-deploy smoke checklist: login request/consume, invite send/accept, SSE live update between two browser sessions hitting `www.mylists.life` / `api.mylists.life`."
  1. DONE 2026-04-16 — Repo-root `Dockerfile` for `@lists/api`, `.dockerignore`, `.github/workflows/migrate.yml` (workflow_dispatch + `DATABASE_URL` secret), Resend/Postmark HTTP + SES (`@aws-sdk/client-sesv2`) in `apps/api/src/auth/mailer.ts`, `docs/email-deliverability.md` checklist, `.env.example` updated; `dotenv` promoted to api runtime deps for Docker/migrate. **§9.2.1** critical-coverage fragments narrowed to `lists/` + shared `auth/` (script + note); lint fixes (`ShareListDialog`, `notifications-ui.test`, `invite-schemas`, `membership/service.test`).
  2. DONE 2026-04-17 — Added API multi-origin CORS support for production via `WEB_ORIGIN_ALLOWLIST` (comma-separated), with test coverage in `apps/api/src/server.test.ts`; keep `WEB_ORIGIN` as canonical web origin for magic-link URLs.
  3. TODO Railway + DNS operator checklist (post-code, no new feature coding expected):
    1. Create Railway project + two services from repo: `lists-api` and `lists-web`.
    2. In each Railway service, set the **Dockerfile path** to repo-root **`Dockerfile`** (`lists-api`) and **`Dockerfile.web`** (`lists-web`). Confirm deploy succeeds to Railway preview URLs (API container **PORT 3001**; web container **`serve`** on **4173** — map Railway’s public HTTP port to those container ports). For `lists-web`, ensure **`VITE_API_URL`** is available at **image build** time (Railway **Docker Build Args** or equivalent), not only as a runtime variable.
    3. Add Railway managed Postgres; set `DATABASE_URL` in API service for staging and production.
    4. Add custom domains in Railway: `api.mylists.life` to API service, `www.mylists.life` to Web service.
    5. In GoDaddy DNS, create CNAME `api` and `app` using the exact Railway targets; remove conflicting A/CNAME records if present.
    6. Wait for DNS propagation and verify Railway domain status turns active with TLS certificates issued.
    7. Set production env vars: API CORS allowlist includes `https://www.mylists.life` (or set `WEB_ORIGIN_ALLOWLIST` for multiple origins such as apex + www); the browser must call the API at `https://api.mylists.life` via **`VITE_API_URL`** baked into the web image (see step **2**).
      - Railway example (`mylists.life`): API service — `WEB_ORIGIN=https://www.mylists.life`, `WEB_ORIGIN_ALLOWLIST=https://mylists.life,https://www.mylists.life`. Web service — **`VITE_API_URL=https://api.mylists.life`** as a **build argument** for `Dockerfile.web` (triggers rebuild when changed).
    8. Run migration workflow against staging DB, then production DB, and capture successful run links in release notes/status. Use workflow input `environment=staging|production` and repo secrets `DATABASE_URL_STAGING` / `DATABASE_URL_PRODUCTION` (keep `confirm=migrate` guard).
    9. Resend: verify domain/auth records (SPF/DKIM/DMARC) for `mylists.life`; send test magic link and confirm deliverability.
    10. Execute production smoke checks: login request/consume, invite send+accept, SSE update observed in second session.
    11. Optional: set root redirect `https://mylists.life` -> `https://www.mylists.life` after app domain is stable.
15. **Support API (optional late):** "`@.cursor/skills/developer-backend/SKILL.md` `@.cursor/skills/developer-security/SKILL.md` — Implement admin-gated support routes **NFR-08** (membership + audit only, no item bodies)."
  1. DONE 2026-04-17

### 14.3 Review checkpoints (recommended)

Use `**@.cursor/skills/developer-senior/SKILL.md`** for **implementation review** at merge boundaries: contracts, authz, transactions, SSE scope, shared Zod, tests, and alignment with `docs/product-requirements.md`, `docs/technical-design.md`, and `docs/tech-stack.md`. It does **not** replace domain skills during build; it catches cross-cutting gaps before the next prompt.

Use `**@.cursor/skills/developer-quality-assurance/SKILL.md`** for **risk-based test planning**, expanding or hardening Playwright/a11y coverage, and release-style smoke criteria—not only in prompt **13**.


| After prompt(s)        | Suggested review                   | Why                                                                        |
| ---------------------- | ---------------------------------- | -------------------------------------------------------------------------- |
| **3** (auth)           | Senior (+ Security if not already) | Cookies, session, CSRF/SameSite, IDOR prep                                 |
| **4** (lists API)      | Senior                             | Soft delete / restore, derived Private/Shared, **FR-L03**/**FR-L10**       |
| **6–7** (library + L1) | Senior + QA (light)                | Shell, **FR-L08** undo, Query keys; empty/error states                     |
| **8** (invites)        | Senior                             | **409** collision, lazy expiry, **FR-L09** / ADR-002, transactional accept |
| **9** (membership)     | Senior                             | Leave/remove, **FR-S14** succession, account-closure hook                  |
| **11–12**              | Senior + QA                        | Toast priority vs errors; **SSE** lifecycle and fallback UX (§9.1)         |
| **13**                 | QA (primary) + Senior              | **§9.3** pack green; coverage gates **§9.2.1**                             |
| **14–15**              | Security + Senior                  | Deploy secrets, support admin gating **NFR-08**                            |


**Security testing (prompts 14–15, automated):** `apps/api/src/server.test.ts` covers CORS allowlist vs rejection, `WEB_ORIGIN` fallback when `WEB_ORIGIN_ALLOWLIST` is unset, single-origin deny for arbitrary `Origin`, and default dev origin. `apps/api/src/support/__tests__/support.integration.test.ts` covers support routes **NFR-08**: `401` without session / invalid token / closed account, `403` non-admin, `404` missing or soft-deleted list, admin read paths. Align with `@.cursor/skills/developer-security/SKILL.md` (session boundaries, least privilege, credentialed CORS).

Skipping reviews is fine on tiny chores; for anything touching **auth, shares, membership, or realtime**, a senior pass before merge reduces rework.

---

## 15. Revision history


| Ver  | Date       | Notes                                                                                                                                                                                                                                                                                                                             |
| ---- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.15 | 2026-04-22 | **§9.1–§9.2:** PR gate now includes Playwright mobile smoke on Android + iPhone emulation (`mobile-chrome`, `mobile-safari`) in addition to Chromium desktop; CI artifact upload captures Playwright report for failures. |
| 1.14 | 2026-04-18 | **§9.2** merge-to-main: CI job **`migrate-production`** applies migrations to production Postgres via **`DATABASE_URL_PRODUCTION`**; operator map in **`docs/infrastructure.md`**.                                                                                                                                 |
| 1.13 | 2026-04-17 | **§2** linked inputs: wireframes **v0.50** (N1 vs **FR-V11-S01**), tech-stack **v1.15**. |
| 1.12 | 2026-04-17 | **§2** linked inputs: PRD **v0.28** (clarifies **MVP** did not require **invite** email; **v1.1** **FR-V11-S01**), MVP TDD **v0.23**, tech-stack **v1.14** (transactional mail = magic + reset + **invite** outbox).                                                                 |
| 1.11 | 2026-04-17 | Prompt **14**: `lists-web` uses repo-root **`Dockerfile.web`** (build + `serve`); **`VITE_API_URL`** as Docker **build arg**; Railway checklist step **2** / **7** aligned; local **`docker build -f Dockerfile`** / **`-f Dockerfile.web`** smoke noted.                                                                        |
| 1.10 | 2026-04-17 | **§2** linked inputs aligned across docs: PRD v0.27, TDD v0.17, wireframes v0.49, tech-stack v1.6.                                                                                                                                                                                                                                |
| 1.9  | 2026-04-17 | **§2** linked inputs: PRD v0.27, TDD v0.16, wireframes v0.48; **§3** time horizon corrected to 2026-04-17; **§15** completed v1.8 revision note.                                                                                                                                                                                  |
| 1.8  | 2026-04-17 | Migrate workflow hardened for staged promotion: `workflow_dispatch` inputs `environment` (staging or production) and `confirm` (must equal `migrate`); job runs only when `confirm == migrate` (see `.github/workflows/migrate.yml`).                                                                                             |
| 1.7  | 2026-04-17 | Prompt **14** follow-up: API multi-origin CORS via `WEB_ORIGIN_ALLOWLIST` (comma-separated); Railway checklist step 7 clarified for apex+www options while keeping canonical `WEB_ORIGIN` for magic-link URL generation                                                                                                           |
| 1.6  | 2026-04-16 | Added prompt **14** operator TODO checklist for Railway + GoDaddy DNS + TLS + migrations + Resend validation + production smoke checks (explicitly post-code setup work)                                                                                                                                                          |
| 1.5  | 2026-04-16 | Prompt **14** updated for `mylists.life` (`www.mylists.life`, `api.mylists.life`), clarified as incremental (use existing Docker/migrate/email work and wire to Railway), rollout table updated to concrete domains                                                                                                               |
| 1.4  | 2026-04-16 | Deployment decision finalized: Railway target + canonical URL pattern (`https://<domain>`, `https://api.<domain>`), prompt **14** made concrete, rollout table updated, SP1 scoped to Railway, email provider locked to Resend                                                                                                    |
| 1.3  | 2026-04-16 | **§14.2** prompt **14**: Dockerfile, migrate workflow, Resend/Postmark/SES mailer + `docs/email-deliverability.md`                                                                                                                                                                                                                |
| 1.2  | 2026-04-16 | **§9.2** PR and merge gates: **Playwright** (Chromium) runs in `.github/workflows/ci.yml` after Vitest coverage; document `db:migrate` as part of CI sequence                                                                                                                                                                     |
| 1.1  | 2026-04-15 | Added test organization pointer in **§9.2.1** to standardize co-located naming and domain-scoped integration-test placement via `AGENTS.md` + `.cursor/rules/testing-conventions.mdc`                                                                                                                                             |
| 1.0  | 2026-04-01 | Added developer-testing skill: **§2** linked inputs, **§9.1** test matrix owner column, **§14** testing note + **§14.1** skill-concern table row                                                                                                                                                                                  |
| 0.9  | 2026-03-31 | **Post-MVP:** §5.2 password + first-login magic; **FR-OF01**–**FR-OF03** local persistence pointer; §4 scope table updated. **§2** PRD v0.24, TDD v0.11, tech-stack v1.3                                                                                                                                                          |
| 0.8  | 2026-03-27 | **CI alignment:** §9.2 PR gate = lint + typecheck + `ci:test:full`; §9.2 **local fast loop** = `ci:test:changed`; **§9.2.1** per-workspace branch floors + critical-coverage script; **§5** Fastify resolved; **§5.1** [status.md](status.md) + hygiene; **§2** TDD v0.9 / tech-stack v1.1; **§14.2** prompt **1** Fastify locked |
| 0.7  | 2026-03-27 | **§14.2**: prompt **1** `npm run test` / `ci:test:full`; **4** backend + restore note; **7**–**10** `@developer-backend`; **8** minimal **FR-S16** vs **11**; **11** completes toast matrix (**§8.1**); **§2** TDD pointer v0.8                                                                                                   |
| 0.6  | 2026-03-27 | **§14**: **§14.1** backend/database/security skills + markdown fix; **§14.3** senior + QA review checkpoints; prompt **6** sync T1 deferred to **9**; prompts **2**/**3**/**4**/**12**/**13** tags; **15** backend+security                                                                                                       |
| 0.5  | 2026-03-27 | Doc control aligned; E1 monorepo paths; **§7.4** DoD; toast minimal→full (**§8.1**); M4/M6 clarifications; W7/W12/W16 updates; **§13** FR-S granularity + NFR-02/03; **§12** account closure; **§9.1** FR-L09 tab-close; **§9.3** account-closure regression; prompts 1/3/8/9/12; **§2** TDD v0.7                                 |
| 0.4  | 2026-03-26 | Added CI coverage policy and bug-fix regression-test rule in §9.2.1; linked thresholds into PR gate                                                                                                                                                                                                                               |
| 0.3  | 2026-03-26 | Expanded testing section with owners, release gates, and mandatory regression pack; aligned rollout checks with test/security gates                                                                                                                                                                                               |
| 0.1  | 2026-03-25 | Initial plan from PRD, wireframes v0.45, TDD v0.4, tech-stack v1                                                                                                                                                                                                                                                                  |
| 0.2  | 2026-03-25 | Canonical doc path [development-plan.md](development-plan.md); linked **developer-frontend-ui** and **developer-frontend-data-sync** skills; §14 prompt table and per-prompt @mentions                                                                                                                                            |


