# Memories — development plan

## 0. How to use this document

This file is the **filled execution plan** for Memories v1 delivery. Work is organized into **production-capable stages** so a **thin slice** (for example **Stage 0.5**) can ship to production, earn signal with real users, and **add capabilities in later epics** without re-architecting the core (auth, media signing, memory rows, capture stepper).

For template structure and section intent, see [development-plan-template.md](templates/development-plan-template.md).

---

## 1. Document control


| Field             | Value                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Title**         | Memories — development plan                                                           |
| **Version**       | 1.7                                                                                   |
| **Author**        | Ken Levy                                                                              |
| **Date**          | 2026-04-30                                                                            |
| **Status**        | Draft                                                                                 |
| **Release**       | Staged: **0.5** (first prod slice) → **0.6–1.0** (see Section 7)                      |
| **Template used** | [docs/templates/development-plan-template.md](templates/development-plan-template.md) |


Per [documentation governance](../.cursor/rules/docs-governance.mdc), derived documents record **Template used** (included above).

---

## 2. Linked inputs


| Artifact                        | Location                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| **PRD**                         | [product-requirements-v1.md](product-requirements-v1.md) v1.5                             |
| **Technical design**            | [technical-design-v1.md](technical-design-v1.md) v1.5                                     |
| **Wireframes**                  | [design-wireframe-v1.md](design-wireframe-v1.md)                                          |
| **User workflow**               | [memories-user-workflow-v1.md](memories-user-workflow-v1.md)                              |
| **Tech stack**                  | [tech-stack.md](tech-stack.md)                                                            |
| **Implementation log**          | [implementation-log.md](implementation-log.md)                                            |
| **Runbook**                     | — (add `docs/runbook.md` when operator steps and on-call playbooks are defined)           |
| **ADR index**                   | [adr/README.md](adr/README.md)                                                            |
| **Baseline / superseded plans** | — (link prior `development-plan-v*.md` here when superseded)                              |
| **Pointer (optional)**          | [development-plan.md](development-plan.md) — stable short link to this edition for humans |
| **Execution status** (optional) | —                                                                                         |


---

## 3. Executive summary

- **Delivery goal:** Implement the Memories vertical (`apps/web`, `apps/api`, `packages/shared`) so **Stage 0.5** can run in **production** with **one photo** and **one in-browser audio recording** per memory, plus **list**, **detail**, **playback**, **JWT authz**, **signed object storage**, **idempotent save**, **offline-tolerant client retry**, and **audit** for PHI-bearing writes. **Later stages** add **multiple images**, **uploaded audio files** (not only `MediaRecorder`), **async transcription** + UI states, **video capture**, and **AI `suggest_prompt` / tags** per PRD priorities—each stage is **deployable** behind the same API/versioning discipline. Success is measured by **safe production operation** (no authz leaks, no PHI in logs), **resilient capture** (retries without duplicate memories), and **traceability** to **FR-** / **NFR-** IDs.
- **Product locks / decisions:** Platform owns IdP and client access; Memories enforces **app-layer authz** on every route (**FR-012**). **Tenancy:** Guide and client-self are **distinct `User`s** with **distinct passwords** (or invite flows); they share only the `**client_id` workspace** (PRD tenancy subsection + TDD §2). **no Postgres RLS** in v1 per TDD; **IndexedDB-only drafts** until finalize; **poll** for transcript status when transcription ships (**FR-009**). **Staged exception (Stage 0.5):** transcription pipeline and `suggest_prompt` may be **off or stubbed** in production until **Stage 0.8 / 1.0**—documented explicitly in Section 4 so PM/compliance can sign the reduced P0 set for the first go-live.
- **Execution approach:** **Foundation and API contracts** first (schema, JWT, signing, CRUD), then **web capture v0.5**, then **production readiness** (observability, smoke/E2E). **Epics E7–E11** layer post–0.5 capabilities **after** the **0.5** milestone (T1–T14) is stable; each epic should merge with **feature flags** or **config** so production can enable capabilities incrementally. (**E6** is production readiness and overlaps **0.5** via T13–T14, T22.)
- **Quality bar:** Align with **[AGENTS.md](../AGENTS.md)** — typically **≥ 80%** line/statement coverage and changed-file floors, **security** per PRD/TDD and `**developer-security`**, and three review layers on non-trivial work: `**developer-code-quality`**, `**developer-senior**` where Section 12 marks **Sr** or trust boundaries move, and `**developer-quality-assurance`** where **QA** is primary or release/regression scope requires it. CI: `npm run lint`, `npm run typecheck`, `npm run test` at minimum before merge.

### 3.1 AI-first delivery assumptions

- This repository uses an AI-first delivery model: AI agents implement and maintain code by default.
- Estimates below assume **AI-assisted** execution; call out **human-only** spikes (e.g. cross-org JWT schema, BAA procurement) in ticket notes.
- **Branching:** humans own branches and PRs unless policy changes ([AGENTS.md](../AGENTS.md)).

---

## 4. Scope of this plan


| In scope                                                                                                         | Out of scope                                             |
| ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Staged prod delivery **0.5 → 1.0** per Section 7                                                                 | Full Ohana Way shell (Dashboard, inbox, AI Guide UI)     |
| REST API under `**/api/v1/`** per [technical-design-v1.md](technical-design-v1.md) §3.2                          | Native mobile apps beyond PWA/browser                    |
| Web: TanStack Router, capture `**?step=`** flow per [memories-user-workflow-v1.md](memories-user-workflow-v1.md) | Postgres RLS in v1                                       |
| Object storage signing + playback signing                                                                        | Practice billing, messaging, telephony                   |
| Drizzle migrations, audit events, job rows when transcription ships                                              | Building full pilot **inside** this repo unless rescoped |


**Stage 0.5 product slice (explicit):**


| PRD capability                                        | In 0.5 production slice                                                                                                           | Deferred stage                                          |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| One image + one recorded audio, list/detail, playback | Yes                                                                                                                               | —                                                       |
| **FR-005** multiple images                            | No (enforce max 1 image in API/UI)                                                                                                | **0.6**                                                 |
| Upload audio **file** (library) vs capture-only       | Capture-only acceptable                                                                                                           | **0.7**                                                 |
| **FR-008** / **FR-009** transcription                 | Optional off or worker disabled; UI may hide transcript block                                                                     | **0.8**                                                 |
| **FR-015** `suggest_prompt`                           | Static copy or shortened stepper; no LLM call required                                                                            | **1.0** (or flagged pilot)                              |
| **FR-017** reactions/comments (P1 groundwork per PRD) | Optional for **0.5**; ship when Appendix A + Dashboard JWT claims are ready—no autonomous family create/delete until PRD revision | **Later** (own epic when unblocked; see TDD Appendix A) |
| **FR-018** `sharing_visibility` (P2)                  | Schema may reserve field in **T2**; product behavior deferred unless pulled forward                                               | **Later**                                               |
| Video recording (workflow screenshots show alternate) | No                                                                                                                                | **0.9**                                                 |


---

## 5. Assumptions and constraints

- **JWT claims** (`practice_id`, `user_id`, `client_id` or broader client scope, roles that distinguish **Guide** vs **client-self**) are agreed with Dashboard; Memories **binds route params to claims** (**FR-012**). Tokens for Guides may authorize **many** `client_id` values; tokens for `**CLIENT_SELF`–type users must be narrow**—path `:clientId` matches focal client only ( **[technical-design-v1.md](technical-design-v1.md)** §2, §7).
- **BAA / NFR-007:** no real PHI in production vendors until BAAs exist; use synthetic data in lower environments.
- **Schema:** `memory_media` may allow multiple rows from **Stage 0.6** onward; **Stage 0.5** enforces **at most one image and one audio** in validation and UI to avoid half-built multi-attach UX.
- **Offline:** client queue and **Idempotency-Key** on finalize (**FR-013**, **FR-014**) are required for 0.5; Background Sync is progressive enhancement.
- **Observability:** adopt [technical-design-v1.md](technical-design-v1.md) §3.3 alert themes; **starter signal names and thresholds** for **NFR-010** are frozen in **§5.1** (tune with ops; log changes in [implementation-log.md](implementation-log.md)).

### 5.1 NFR-010 — Operations alerting defaults

**Purpose:** Give engineering and on-call a **first concrete** alerting contract (PRD **NFR-010** + TDD §3.3). These are **starting values**, not SLO promises—**Decision owner** fills names in metrics backend and adjusts burn rates after baseline weeks.


| Signal (maps to TDD §3.3 theme)                          | Starter condition (staging + prod)                                                                                   | Decision owner (fill)    | Notes                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------- |
| `**GET /health` failure**                                | ≥ **2** consecutive failed probes from synthetic checker, or error rate **> 5%** over **5 m**                        | Infra / Memories on-call | Exclude deploy blips with short suppression window if needed.  |
| **Authenticated list canary** (`GET …/memories?cursor=`) | **5xx** rate **> 1%** over **15 m** or **p95 latency > 2 s** over **15 m** (adjust per environment)                  | Memories eng             | Use non-PHI fixture `clientId` + service token in canary only. |
| `**POST …/uploads/images/sign` errors**                  | Error budget: **> 2%** of attempts **5xx/4xx(other than expected validation)** over **15 m**                         | Memories eng             | Correlate with object-storage provider status.                 |
| `**POST …/uploads/audio/sign` errors**                   | Same as image sign                                                                                                   | Memories eng             | Pair with upload path dashboards.                              |
| `**POST …/memories` finalize errors**                    | **> 1%** failure rate over **15 m** (excluding known 401/403 abuse)                                                  | Memories eng             | Pilot-critical per TDD §3.3.                                   |
| **Object storage signer failures**                       | Any sustained inability to issue signed URL (provider **5xx** or local signer error) **> 5 m**                       | Memories eng             | Treat as **Sev2** until cleared (TDD §3.3).                    |
| **Transcript jobs stuck `pending`**                      | After **Stage 0.8** live: age **> 15 m** (staging) / **> agreed SLA** (prod) for **> N** jobs (start with **N ≥ 3**) | Memories eng             | When STT off, mute or gate this alert.                         |
| `**suggest_prompt` tail latency**                        | After **Stage 1.0**: **p95 > 1.5 s** sustained **15 m** or spike in timeout count (server **~1.8s** cap)             | Memories eng             | Tie to LLM/provider health.                                    |


**Process:** After dashboards exist, **ticket the metric names + query links** from **T13** into **implementation-log** and set **Decision owner** roster. Page only after runbook exists (`[docs/runbook.md](runbook.md)` — add when defined).

---

## 6. Work breakdown (epics and tickets)

### 6.1 Epics


| ID      | Epic                                                    | Goal                                                                                                                                                                                                                     | PRD / design refs                                     |
| ------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| **E1**  | Foundation & shared contracts                           | Tooling, `@memories/shared` request/response shapes, CI alignment                                                                                                                                                        | **NFR-011**; TDD §6                                   |
| **E2**  | AuthN / authZ / audit baseline                          | JWT verification, client binding, denial logging, `audit_events` append                                                                                                                                                  | **FR-012**, **FR-019**, **NFR-008**                   |
| **E3**  | Persistence & memory CRUD                               | Drizzle schema, migrations, CRUD + idempotent create                                                                                                                                                                     | **FR-001**–**FR-004**, **FR-010**, **FR-013**         |
| **E4**  | Upload & playback signing                               | Image/audio sign PUT, signed read for playback                                                                                                                                                                           | **FR-005**, **FR-006**, **FR-011**, **NFR-002**       |
| **E5**  | Web v0.5 capture & list                                 | Single photo + recorded audio stepper, IndexedDB draft, list/detail                                                                                                                                                      | **FR-002**, **FR-007**, **FR-014**, **NFR-012**       |
| **E6**  | Production readiness                                    | Health, structured logging, alerting hooks, E2E/smoke paths                                                                                                                                                              | **NFR-003**, **NFR-006**, **NFR-010**                 |
| **E7**  | Multi-image                                             | Multiple `MemoryMedia` images, ordering, UI gallery                                                                                                                                                                      | **FR-005**, **FR-011**                                |
| **E8**  | Upload audio file                                       | Library/file path + validation alongside recorder                                                                                                                                                                        | **FR-006**                                            |
| **E9**  | Transcription                                           | Job worker, `**GET …/transcript`**, pending/ready/failed UI                                                                                                                                                              | **FR-008**, **FR-009**                                |
| **E10** | Video recording                                         | Signed video upload, `memory_media.type` video, UI branch                                                                                                                                                                | Workflow alternates (PRD multimedia); handoff-aligned |
| **E11** | AI prompt & tags                                        | `suggest_prompt` adapter, timeout/fallback; curator tags (**FR-016** groundwork)                                                                                                                                         | **FR-015**, **FR-016**, **NFR-005**, **NFR-009**      |
| **E12** | Comments, reactions & sharing visibility (**deferred**) | `**memory_comments` / reactions** per [technical-design-v1.md](technical-design-v1.md) Appendix A (**FR-017**); `**sharing_visibility` behavior** (**FR-018**)—no autonomous family create/delete until PRD + JWT uplift | **FR-017**, **FR-018**; TDD §5, Appendix A            |


### 6.2 Ticket map

Reviewer legend: **Sr** = senior, **Sec** = security-sensitive, **QA** = QA primary, **Manual** = product/lead sign-off.


| Ticket  | Title                                                                                                                             | Epic | Depends on                               | Owner lane           | Primary reviewers | Estimate |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------- | -------------------- | ----------------- | -------- |
| **T1**  | Shared Zod contracts for memory, media, errors, pagination                                                                        | E1   | —                                        | Shared               | Sr                | S        |
| **T2**  | Drizzle schema + migrations: memories, memory_media, audit_events, transcript/jobs stubs                                          | E3   | T1                                       | Backend + DB         | Sr                | M        |
| **T3**  | Fastify API shell: versioning, correlation id, JWT verify (JWKS config)                                                           | E2   | T1                                       | Backend              | Sr, Sec           | M        |
| **T4**  | Authz middleware: `clientId` + memoryId binding to JWT; 403 telemetry                                                             | E2   | T3                                       | Backend              | Sr, Sec           | M        |
| **T5**  | `POST /api/v1/uploads/images/sign` (limits, MIME)                                                                                 | E4   | T3, T4                                   | Backend              | Sec               | M        |
| **T6**  | `POST /api/v1/uploads/audio/sign`                                                                                                 | E4   | T3, T4                                   | Backend              | Sec               | S        |
| **T7**  | `POST /api/v1/memory-media/:mediaId/sign-read`                                                                                    | E4   | T2, T3, T4                               | Backend              | Sec               | M        |
| **T8**  | `POST /api/v1/clients/:clientId/memories` idempotent finalize + **0.5 rule: max 1 image + 1 audio**                               | E3   | T2, T5, T6, T4                           | Backend + DB         | Sr, Sec           | L        |
| **T9**  | `GET` list + detail, `PATCH`, `DELETE` (soft) + audit on mutations                                                                | E3   | T8                                       | Backend + DB         | Sr                | L        |
| **T10** | Web: router shell, list **ML1**, detail playback via signed URLs                                                                  | E5   | T9, T7                                   | Frontend UI + sync   | QA                | L        |
| **T11** | Web: capture stepper **0.5** (photo, meta, static/skip prompt, record, review, done)                                              | E5   | T10, T5, T6, T8                          | Frontend UI + sync   | QA                | L        |
| **T12** | IndexedDB draft + retry queue + idempotency header on finalize                                                                    | E5   | T11                                      | Frontend data sync   | Sr                | M        |
| **T13** | Observability: pino JSON metadata-only logs, `/health`, alert metric hooks doc                                                    | E6   | T3                                       | Backend + manager    | —                 | M        |
| **T14** | Automated tests: API authz + idempotency; web critical path; Playwright smoke                                                     | E6   | T9, T11                                  | Testing              | QA                | L        |
| **T15** | **Stage 0.6** — multi-image: raise limits, sort_order, UI add/remove                                                              | E7   | T8, T9, T10, T11                         | Full stack           | Sr, QA            | L        |
| **T16** | **Stage 0.7** — upload audio file path (picker) + signer constraints                                                              | E8   | T6, T11                                  | Frontend + backend   | QA                | M        |
| **T17** | **Stage 0.8** — transcription worker + `GET …/transcript` + detail poll                                                           | E9   | T2, T8, T9                               | Backend + DB         | Sr, Sec           | L        |
| **T18** | **Stage 0.8** — transcript UI states (pending/ready/failed)                                                                       | E9   | T17, T10                                 | Frontend             | QA                | M        |
| **T19** | **Stage 0.9** — video: sign endpoint, `MediaRecorder` video, storage type                                                         | E10  | T4, T5 pattern                           | Full stack           | Sr, QA            | L        |
| **T20** | **Stage 1.0** — `POST …/suggest_prompt` + timeout/fallback + wire `?step=prompt`                                                  | E11  | T3, T4                                   | Backend + AI adapter | Sec               | M        |
| **T21** | **Stage 1.0** — tags on create/update (no auto suggest until **FR-016**)                                                          | E11  | T9                                       | Full stack           | —                 | M        |
| **T22** | Release checklist: staging → prod, flags, synthetic PHI policy, manual matrix sign-off                                            | E6   | T14                                      | Manager + QA         | Manual            | S        |
| **T23** | **FR-017** — Comments/reactions API + detail UI (matrix + audit); blocked until Dashboard JWT encodes Appendix A roles/visibility | E12  | T9; **blocked:** JWT schema + PM go      | Full stack           | Sr, Sec, QA       | L        |
| **T24** | **FR-018** — Persist and enforce `**sharing_visibility`** (and UX to set it); may trail **T23**                                   | E12  | T23; **blocked:** FR-017 scope agreement | Full stack           | Sr, QA            | M        |


**Definition of ready — T23 / T24:** (1) Written JWT claim names and role matrix from Dashboard (**FR-012** analog). (2) PM sign-off that autonomous family **create/delete** remain **out** unless PRD + Appendix A change. (3) Wireframes/design update for comment thread if not covered by existing **MC**/detail states.

---

## 7. Sequencing and milestones

### 7.1 Release stages and milestones

Stages are **product semantics**; map to git/CI as **tags** or release notes (`v0.5.0`, …).


| Stage     | Milestone outcome                                                                                                            | Ticket IDs (minimum)                                                                       | Production note                                                            |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| **0.5**   | **First production-capable slice:** 1 image + 1 recorded audio; list/detail; authz; offline retry; no transcription required | T1–T14 (exclude T15+)                                                                      | Enable after **Manual** matrix (Section 12.5); STT **off** or not deployed |
| **0.6**   | Multiple images per memory                                                                                                   | T15                                                                                        | Backward compatible API                                                    |
| **0.7**   | Audio file upload                                                                                                            | T16                                                                                        | Complements recorder                                                       |
| **0.8**   | Transcription jobs + poll + UI states                                                                                        | T17, T18                                                                                   | Requires BAA-gated vendor for real PHI                                     |
| **0.9**   | Video capture + playback                                                                                                     | T19                                                                                        | New media MIME paths                                                       |
| **1.0**   | PRD-aligned v1 polish: AI prompt path + curator tags                                                                         | T20, T21                                                                                   | Feature-flag LLM per env                                                   |
| **Ops**   | Staging/prod parity checklist                                                                                                | T22                                                                                        | Every stage                                                                |
| **Later** | **FR-017** / **FR-018** social + visibility (**E12**)                                                                        | **T23**, **T24** (not in stages **0.5–1.0** until **Definition of ready** in §6.2 cleared) | Enable when platform JWT + PRD gates satisfied                             |


### 7.2 Parallel track guidance

- **Contracts + DB:** T1 → T2 (early; blocks API).
- **Security spine:** T3 → T4 (blocks all `/api/v1/` routes).
- **Signing & finalize:** T5, T6 in parallel after T4; **T8** integrates.
- **Read paths:** T7, T9 after T8 foundations.
- **Web:** T10 and T11 can overlap **after** T9 list/detail stub exists; **T12** tightens resilience.
- **Post-0.5:** T15–T21 independently sequenced **after** T14 green; prefer **ordering 0.6 → 0.7 → 0.8 → 0.9 → 1.0** to minimize UI churn.

Skills reference: match owner lane to `.cursor/skills/<name>/SKILL.md` (see Section 12.1).

---

## 8. Testing and quality plan


| Area             | Minimum coverage expectation                                                                     | Related IDs             |
| ---------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| Unit / component | **≥ 80%** statements/lines repo policy; Vitest + Testing Library for web; exercise Zod contracts | **NFR-011**             |
| API              | Authz matrix (403 cross-tenant), idempotent create, signing URL constraints                      | **FR-012**, **FR-013**  |
| Web / component  | Stepper state machine, offline queue happy path, error copy                                      | **FR-014**, **NFR-012** |
| E2E / smoke      | Playwright: login stub (or test JWT), capture **0.5**, list open                                 | **NFR-011**             |


Quality gates:

- Keep CI gates from [AGENTS.md](../AGENTS.md) unless this plan’s revision history records a **waived** change with owner + expiry.
- **Manual scenarios:** execute or sign off per **§12.5** before treating a stage as release-ready; **0.5** matrix rows may be signed **incrementally** as their **Related tickets** land (see **§12.5** intro), but **Stage 0.5** production still needs **every** **0.5** row completed.
- **Mobile web:** PR smoke on **mobile Chrome + mobile Safari (WebKit)** per **§12.6** when `apps/web` capture or list UX changes.
- Regression focus: **authz**, **idempotency**, **signing expiry**, **transcript state** once **0.8** ships; **accessibility** (**NFR-004**, **NFR-012**) on primary flows via T11/T14 and design-wireframe states.
- Update [implementation-log.md](implementation-log.md) when tickets complete.
- New ADRs for trust-boundary or contract changes; index under [adr/README.md](adr/README.md).
- **Structural pass:** `.cursor/skills/developer-code-quality/SKILL.md` before review on non-trivial PRs.

**Verify commands (root):** `npm run lint`, `npm run typecheck`, `npm run test`. Add Playwright per workspace scripts when introduced (see Section 12.3).

**NFR-010:** Implement hooks and dashboards against **§5.1**; record metric IDs and tuning decisions in **implementation-log** after **T13**.

---

## 9. Rollout and operations

1. **Stage 0.5:** deploy API + web to staging; run **T14** automation + Section 12.5 manual matrix; enable production with **transcription disabled** and **static prompt** only.
2. **Feature flags / config:** `STT_ENABLED`, `LLM_PROMPT_ENABLED`, `MAX_IMAGES` (1 → N), `VIDEO_ENABLED`—exact names are implementation details; document in [implementation-log.md](implementation-log.md).
3. **Monitoring:** wire dashboards per [technical-design-v1.md](technical-design-v1.md) §3.3; **threshold seeds** live in **§5.1** (tune post-baseline).
4. **Health / readiness:** confirm load-balancer probes target `**GET /health`** and authenticated canary parameters match TDD when production canaries are added.

**Rollback:**

- Revert deployment to prior image/tag; **do not** run destructive migrations backward without a written DB rollback (prefer forward fixes).
- Disable feature flags for **new** media types if partial rollback is needed (e.g. video off while API remains).

---

## 10. Risks and mitigations


| Risk                                         | Impact                                     | Mitigation                                                                              |
| -------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| JWT claim drift vs Dashboard                 | High — authz bugs or outage                | Contract tests + shared doc owner; **Sr** on T3/T4                                      |
| Shipping 0.5 without transcription vs PRD P0 | Process — stakeholders expect STT          | Explicit scope table (Section 4); PM/compliance sign-off on **0.5**                     |
| PHI in logs                                  | Compliance                                 | Metadata-only logging reviews (**Sec** on sensitive tickets)                            |
| Multi-stage schema migrations                | Medium                                     | Forward-compatible schema in T2 (nullable transcript, media `type` enum)                |
| Offline duplicate saves                      | High — bad UX                              | Idempotency + tests (**T8**, **T12**)                                                   |
| **FR-017** blocked on Dashboard JWT          | Schedule slip for family/read interactions | Definition of ready in §6.2; track cross-repo milestone owner in **implementation-log** |


---

## 11. Traceability summary


| PRD / TDD focus                                        | Tickets                                                                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| **FR-001**–**FR-004**, **FR-010**, **FR-013**          | T2, T8, T9                                                                                                            |
| **FR-005**, **FR-011**                                 | T5, T8, T11, **T15**                                                                                                  |
| **FR-006**                                             | T6, T11, **T16**                                                                                                      |
| **FR-007**, **NFR-012**                                | T11                                                                                                                   |
| **FR-008**, **FR-009**                                 | **T17**, **T18**                                                                                                      |
| **FR-012**, **NFR-008**                                | T3, T4                                                                                                                |
| **FR-014**                                             | T11, T12                                                                                                              |
| **FR-015**                                             | **T20**                                                                                                               |
| **FR-016** (groundwork)                                | **T21**                                                                                                               |
| **FR-019**                                             | T2, T8, T9                                                                                                            |
| **FR-017**                                             | **T23** (blocked—§6.2 **Definition of ready**); tables stubbed per TDD §5 until epic runs                             |
| **FR-018**                                             | **T24** (blocked—after **T23** + product); column may ship with **T2** schema only until behavior lands               |
| **NFR-001** (HTTPS prod)                               | Infra/hosting—verify in **T22** rollout + environment config (not Memories-only ticket)                               |
| **NFR-004**, **NFR-012** (a11y + elder UX)             | T11, T15 (UX review), **§12.5–12.6**; wireframe states per [design-wireframe-v1.md](design-wireframe-v1.md)           |
| **NFR-006**                                            | T13                                                                                                                   |
| **NFR-010**                                            | T13 (**hooks**); **§5.1** (**threshold defaults**); **implementation-log** (**owners + metric IDs** after dashboards) |
| **NFR-007** (BAAs)                                     | Rollout **§9**, **T22**; blocks real PHI in prod vendors                                                              |
| Video (multimedia; not telephony—see PRD out-of-scope) | **T19**                                                                                                               |


---

## 12. Sequenced ticket-like prompts (optional; run one at a time)

### Session defaults (read once per plan / branch execution)

- `**developer-testing`** — Follow `.cursor/skills/developer-testing/SKILL.md` for test runs.
- `**developer-code-quality`** — Structural pass before review (**Section 8**); aligns with closing note after **§12.5**.
- **Git / PRs:** Do **not** create branches or PRs unless the human asks ([AGENTS.md](../AGENTS.md)).

### 12.1 Skill-reading convention (required per prompt)

Each prompt ends with **Skills to read first** naming `.cursor/skills/<name>/` folders. Lines are intentionally **lean** (lane + conditional extras per [development-plan-template.md](templates/development-plan-template.md) §12.1): add `**developer-security`** for JWT, signing, or audit boundaries; `**developer-unit-testing`** when the ticket **introduces or reshapes** suites; `**developer-quality-assurance`** / `**developer-manager`** only when the §6.2 ticket implies QA matrix or rollout ownership; `**developer-senior`** on high‑risk merges (authz, idempotency, cross-cutting contracts) or wherever §6.2 marks **Sr** as primary reviewer **before** merge.

**Session defaults** (the Section 12 opening bullets above) apply to **every** prompt without repeating them on each card: `**developer-testing`** (how to run and triage CI/local tests) and `**developer-code-quality`** (structural pass before review — Section 8). That pairing satisfies the intent of broader “baseline skills” coordination in `**.cursor/skills/developer-manager/SKILL.md`** for **this repo**. Explicit `**developer-testing`** on **T14**-style prompts remains appropriate because those tickets own the harness expansion.

Repository skill folders include: `developer-backend`, `developer-database`, `developer-frontend-ui`, `developer-frontend-data-sync`, `developer-security`, `developer-unit-testing`, `developer-testing`, `developer-quality-assurance`, `developer-senior`, `developer-manager`, `developer-code-quality`.

### 12.2 Per-ticket prompts (T1–T24)

**Closure convention:** `**DONE yyyy-mm-dd`** closes a prompt for execution tracking; the **Skills** / **Verify** lines remain useful for regressions or for agents picking up partial work—no need to delete completed cards unless the task is superseded.

#### Prompt T1 — Shared Zod contracts for memory, media, errors, pagination

Implement `@memories/shared` schemas for list/detail DTOs, error body (`code`, `message`, `request_id` alignment), and cursor pagination fields per [technical-design-v1.md](technical-design-v1.md) §3.2. Export types. Add unit tests for edge cases (empty lists, max lengths).

**Skills to read first:** `developer-unit-testing` (test patterns).

**Verify:** `npm run test -w @memories/shared` (or root `npm run test` once wired).

DONE 2026-04-30

---

#### Prompt T2 — Drizzle schema + migrations

Create `memories`, `memory_media`, `audit_events`, and stubs for transcript/jobs per TDD §5. Include soft-delete, `practice_id`, `client_id`, and media `type` enum supporting future video. No RLS.

**Skills to read first:** `developer-database`, `developer-backend`.

**Verify:** Migrations apply clean on empty DB; `npm run typecheck --workspaces --if-present`.

DONE 2026-04-30

---

#### Prompt T3 — Fastify API shell + JWT verification

Mount `/api/v1`; implement JWKS JWT verify; attach `request_id`; reject unsigned routes except `/health`.

**Skills to read first:** `developer-backend`, `developer-security`, `developer-senior`.

**Verify:** Unit/integration tests with mocked JWKS; `npm run test -w @memories/api`.

DONE 2026-04-30

---

#### Prompt T4 — Authz middleware

Bind `:clientId` and memory routes to JWT claims; emit structured denial logs without PHI (**NFR-008**).

**Skills to read first:** `developer-backend`, `developer-security`, `developer-senior`.

**Verify:** Tests for cross-client access forbidden.

DONE 2026-04-30

---

#### Prompt T5 — Image upload sign endpoint

Implement `POST /api/v1/uploads/images/sign` with MIME/size constraints (**FR-011**).

**Skills to read first:** `developer-backend`, `developer-security`.

**Verify:** Contract tests + happy path signer mock.

DONE 2026-04-30

---

#### Prompt T6 — Audio upload sign endpoint

Implement `POST /api/v1/uploads/audio/sign` per TDD §3.2.

**Skills to read first:** `developer-backend`, `developer-security`.

**Verify:** Same as T5 pattern.

DONE 2026-04-30

---

#### Prompt T7 — Playback sign-read endpoint

Implement `POST /api/v1/memory-media/:mediaId/sign-read` separate from upload signing (**NFR-002**).

**Skills to read first:** `developer-backend`, `developer-security`, `developer-senior`.

**Verify:** Forbidden when memory not visible to caller.

DONE 2026-04-30

---

#### Prompt T8 — Idempotent memory finalize (**0.5** limits)

Implement `POST /api/v1/clients/:clientId/memories` with **Idempotency-Key**, server-assigned ids, `**audit_events`** on success, enforcing **≤1 image media + ≤1 audio media** until Stage 0.6.

**Skills to read first:** `developer-backend`, `developer-database`, `developer-security`, `developer-senior`.

**Verify:** Replay same key → same `memory_id`; exceeding media limits → 400.

DONE 2026-04-30

---

#### Prompt T9 — List, detail, patch, delete

Implement cursor list, detail with media descriptors, patch allowed fields, soft delete (**FR-010**, **FR-003**, **FR-004**).

**Skills to read first:** `developer-backend`, `developer-database`.

**Verify:** Pagination tests; patch authz roles per Appendix A baseline.

DONE 2026-04-30

---

#### Prompt T10 — Web list + detail + playback wiring

TanStack Router: list route, detail route, facilitator chrome; fetch detail; request signed playback URLs.

**Skills to read first:** `developer-frontend-ui`, `developer-frontend-data-sync`.

**Verify:** Vitest/component tests where practical; manual smoke checklist started.

DONE 2026-04-30

---

#### Prompt T11 — Capture stepper v0.5

Single capture photo, meta (**FR-007**), simplified prompt step (static), `MediaRecorder` audio, review, done. Match [memories-user-workflow-v1.md](memories-user-workflow-v1.md) URLs.

**Skills to read first:** `developer-frontend-ui`, `developer-frontend-data-sync`.

**Verify:** Golden path manually on phone viewport; linter clean.

DONE 2026-04-30

---

#### Prompt T12 — IndexedDB draft + retry queue

Persist draft blobs + metadata; backoff retry finalize; attach idempotency header (**FR-014**, **FR-013**).

**Skills to read first:** `developer-frontend-data-sync`, `developer-senior`.

**Verify:** Simulate offline in tests or Playwright hook.

DONE 2026-04-30

---

#### Prompt T13 — Observability baseline

Structured metadata-only logs; document metric names aligned to TDD §3.3; ensure `/health` suitable for probes.

**Skills to read first:** `developer-backend`, `developer-manager`.

**Verify:** Sample log lines reviewed for PHI absence; staging probe works.

DONE 2026-04-30

---

#### Prompt T14 — Test suite consolidation + Playwright smoke

API integration tests for T3–T9 critical paths; web smoke for capture 0.5; gate on coverage policy.

**Skills to read first:** `developer-unit-testing`, `developer-quality-assurance`, `developer-testing`.

**Verify:** `npm run lint`, `npm run typecheck`, `npm run test` green.

DONE 2026-04-30

---

#### Prompt T15 — Multi-image (**Stage 0.6**)

Raise server/UI limits; sort order; list thumbnails; preserve 0.5 memories.

**Skills to read first:** `developer-backend`, `developer-frontend-ui`, `developer-frontend-data-sync`.

**Verify:** Regression tests for max media; UX review (**NFR-012**).

---

#### Prompt T16 — Upload audio file (**Stage 0.7**)

File picker → sign → PUT; validate MIME/duration/size with clear errors (**FR-006**).

**Skills to read first:** `developer-frontend-ui`, `developer-backend`.

**Verify:** Manual upload + playback; automated happy path where stable.

---

#### Prompt T17 — Transcription backend (**Stage 0.8**)

Worker consumes job rows; STT adapter (stub ok in dev); `GET …/transcript` poll contract.

**Skills to read first:** `developer-backend`, `developer-database`, `developer-security`.

**Verify:** Pending → ready/failed transitions under test doubles.

---

#### Prompt T18 — Transcript UI (**Stage 0.8**)

Detail + list cues for pending/ready/failed (**FR-009**).

**Skills to read first:** `developer-frontend-ui`, `developer-frontend-data-sync`.

**Verify:** Snapshot or component tests for states.

---

#### Prompt T19 — Video (**Stage 0.9**)

Extend signing and web flow for recorded video; storage key layout unchanged; performance smoke on mobile.

**Skills to read first:** `developer-frontend-ui`, `developer-backend`, `developer-database`.

**Verify:** Upload + playback; codec/MIME documented.

---

#### Prompt T20 — `suggest_prompt` (**Stage 1.0**)

Implement POST per TDD §3.2 with **~1.8s** timeout and static fallback (**NFR-005**, **NFR-009**).

**Skills to read first:** `developer-backend`, `developer-security`.

**Verify:** Latency/unit tests using stub adapter.

---

#### Prompt T21 — Tags (**Stage 1.0**)

Curator tags on create/update; no auto suggestion loop (**FR-016** P2) unless product pulls forward.

**Skills to read first:** `developer-backend`, `developer-frontend-ui`.

**Verify:** PATCH + create payloads validated.

---

#### Prompt T22 — Release checklist

Staging→prod checklist: flags, secrets rotation, BAAs noted, dashboards, Section 12.5 manual sign-off captured.

**Skills to read first:** `developer-manager`, `developer-quality-assurance`.

**Verify:** Written checklist archived in PR notes + **implementation-log** delta.

---

#### Prompt T23 — **FR-017** Comments & reactions (**E12**; blocked)

**Gate:** Complete **§6.2 Definition of ready** (Dashboard JWT claims for Appendix A roles; PM confirms no autonomous family create/delete).

Implement API routes + persistence for **comments/reactions** per [technical-design-v1.md](technical-design-v1.md) Appendix A and data sketch §5; detail UI aligned with **[design-wireframe-v1.md](design-wireframe-v1.md)**; **audit_events** on PHI-bearing writes (**FR-019**). Deny reads/writes inconsistent with JWT.

**Skills to read first:** `developer-backend`, `developer-database`, `developer-frontend-ui`, `developer-frontend-data-sync`, `developer-security`, `developer-senior`.

**Verify:** Role-matrix tests (Guide vs Family); manual scenario in **§12.5** (“Later” row); CI green.

---

#### Prompt T24 — **FR-018** Sharing visibility (**E12**; blocked)

**Gate:** **T23** merged or waived by PM **and** `**sharing_visibility`** semantics signed off.

Persist and enforce `**sharing_visibility`** end-to-end (API validation + UI when product requires). Document default for legacy rows.

**Skills to read first:** `developer-backend`, `developer-frontend-ui`, `developer-database`, `developer-security`.

**Verify:** PATCH/create validation tests; UX copy review (**NFR-012**).

---

### 12.3 Standard test commands

Workspaces use `**@memories/web`** and `**@memories/api`** (see root `package.json`).

1. `npm run lint`
2. `npm run typecheck`
3. `npm run test`
4. When Playwright exists: install browsers per workspace README, then run the CI-equivalent script for `@memories/web`.

### 12.4 Epic review and acceptance matrix

**Merge-ready expectation (non-trivial work):** green CI with `npm run lint`, `npm run typecheck`, and `npm run test` (including coverage floors in [AGENTS.md](../AGENTS.md)); `developer-code-quality` checklist complete before review; apply `developer-senior`, `developer-security`, and `developer-quality-assurance` wherever the reviewer column and risk profile require.


| Epic      | Includes tickets | Primary reviewers                                       | Epic done gate                                                                                                                                       |
| --------- | ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1–E6** | T1–T14, T22      | Sr/Sec/QA per §6.2 reviewer column; code-quality always | Stage **0.5** rows in §12.5 are signed off **and** T22 release checklist complete; CI green with coverage floors; authz/audit/no-PHI-log checks pass |
| **E7**    | T15              | Sr, QA                                                  | Multi-image UX approved                                                                                                                              |
| **E8**    | T16              | QA                                                      | Upload + record both work                                                                                                                            |
| **E9**    | T17,T18          | Sr, QA, Sec (vendor)                                    | Transcript states correct                                                                                                                            |
| **E10**   | T19              | Sr, QA                                                  | Video on supported devices documented                                                                                                                |
| **E11**   | T20,T21          | Sec                                                     | Prompt/tags behind flags                                                                                                                             |
| **E12**   | T23,T24          | Sr, QA, Sec                                             | **§6.2 Definition of ready** satisfied; Appendix A JWT parity; CI + manual §12.5 “Later” row                                                         |


### 12.5 Manual test execution matrix

**How to use this matrix:** Rows are ordered **roughly** by dependency (API spine → signing → CRUD → web shell → capture → hardening). **Related tickets** names every ticket whose work the **Steps** assume; treat the row as **runnable and sign-offable only after all** of those tickets are merged (for example **T4,T9** needs list/detail routes from **T9**, not authz alone from **T4**). **Sign off** in the **Sign-off** column when **Steps** pass in a suitable environment (local, staging, or ephemeral). **Stage 0.5** production still requires **every** **0.5** row below **and** the **T22** release checklist—not only the capture row. Rows without **T10**–**T12** may use **REST** or **curl** / API client plus seeded or synthetic JWTs; **T10**+ rows exercise the browser.


| Epic      | Scenario                                  | Related tickets | Steps                                                                                                      | Expected result                                                | Sign-off      |
| --------- | ----------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------- |
| **0.5**   | Protected routes reject bad / missing JWT | T3              | Omit `Authorization` or send malformed token on a protected `/api/v1/…` route; call `/health` without auth | Protected routes rejected per contract; `/health` 200          | Ken 4/30      |
| **0.5**   | API `client_id` / memory authz (403)      | T4,T9           | Valid JWT; `GET` list or `GET` detail for another tenant’s `client_id` or unrelated `memory_id`            | **403**; error body has no PHI (**NFR-008**)                   | Ken 4/30      |
| **0.5**   | Image + audio **upload** sign URLs        | T5,T6           | `POST` sign endpoints; exercise oversize / disallowed MIME where safe                                      | Policy enforced; URLs usable only for intended upload          | Ken 4/30      |
| **0.5**   | Finalize idempotency + **0.5** media caps | T8              | Same **Idempotency-Key** twice; attempt finalize with >1 image or >1 audio                                 | Same `memory_id` on replay; **400** on cap breach              | Manual / date |
| **0.5**   | List, detail, **PATCH**, soft **DELETE**  | T9              | Cursor list, detail with media refs, allowed **PATCH**, **DELETE**                                         | Contract + audit behavior per TDD; soft delete visible in list | Manual / date |
| **0.5**   | Playback **sign-read**                    | T7,T9           | `POST` sign-read for allowed `mediaId`; repeat for media outside caller’s scope                            | Time-limited read URL for allowed; **403** for denied          | Manual / date |
| **0.5**   | Web list + detail + playback              | T10,T7,T9       | With test JWT: open list → detail → start playback (memory may be created via API or prior seed)           | Playback works; empty/loading/error states sane                | Manual / date |
| **0.5**   | Web cross-client isolation                | T4,T10          | As user A, open user B’s `client_id` route (deep link or tampered segment)                                 | **403** or safe blocked UX; no other tenant data               | Manual / date |
| **0.5**   | Ops smoke: `/health` + log spot-check     | T13             | `GET /health`; trigger sample traffic; inspect log fields                                                  | **200**; structured logs; no PHI in payloads (**NFR-008**)     | Manual / date |
| **0.5**   | Guided capture saves one memory           | T11,T12,T14     | Complete photo → meta → record → save; airplane mode mid-save → resume                                     | Exactly one DB row; playback works                             | Manual / date |
| **0.6**   | Multiple photos                           | T15             | Attach 3 images reorder                                                                                    | Ordering persisted                                             | Manual / date |
| **0.7**   | Upload audio file                         | T16             | Pick file, save                                                                                            | Playback matches record path                                   | Manual / date |
| **0.8**   | Transcription                             | T17,T18         | Record audio; poll until ready                                                                             | Text appears; failures readable                                | Manual / date |
| **0.9**   | Video                                     | T19             | Capture short clip                                                                                         | Playback OK on target devices                                  | Manual / date |
| **Later** | **FR-017** / **FR-018** (when unblocked)  | T23,T24         | Role-appropriate comment add/read; denial for wrong role; set visibility → family sees per policy          | Matches Appendix A + PRD; no PHI in notifications              | Manual / date |


### 12.6 Mobile automation standard

PR merges that touch `**apps/web`** capture, list, or detail layouts should keep **narrow mobile smoke** in CI plus broader regressions on a documented cadence (aligns with [AGENTS.md](../AGENTS.md) and `.cursor/skills/development-planner/SKILL.md`).


| Requirement         | Detail                                                                                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smoke paths**     | Short flows on **viewport-sized** Chromium + WebKit projects: open list → FAB → capture **0.5** golden path steps through save (stub auth / test JWT as implemented).                                                                                          |
| **PR gate**         | Run Playwright **device/emulation profiles** covering **mobile Chrome** and **mobile Safari** class behavior (repo naming may vary—e.g. `**mobile-chrome`** + `**webkit`** / `**mobile-safari`** projects). Both must pass before merge when UI paths changed. |
| **Artifacts**       | On failure, attach **trace / HTML report** paths to the PR (see `**developer-testing`**).                                                                                                                                                                      |
| **Full regression** | Broader matrix (tablet, rotate, flaky network) **nightly** or **pre-release**, per team capacity—not every PR.                                                                                                                                                 |


---

## 13. Revision history


| Version | Notes                                                                                                                                                                                                                                                             |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.0     | Initial staged development plan (**0.5** prod slice → **1.0**); aligns to PRD v1.2 + TDD v1.2.                                                                                                                                                                    |
| 1.1     | Align linked-input versions (**PRD/TDD v1.3**); fix epic numbering (**E7–E11**); clarify **FR-017** / **FR-018**; trace **NFR-001**, **NFR-004**, **NFR-007**; add **§12.6** mobile standard; tighten quality gates (**§12.5–§12.6**, a11y).                      |
| 1.2     | **§5.1** NFR-010 alerting starters; **E12** + **T23**/**T24** + Definition of ready; **§12.1** session-default vs lean **Skills** (developer-manager alignment); prompts **T23–T24**; **§12.4–12.5** **E12** / Later scenarios.                                   |
| 1.3     | **§12.2** heading **T1–T24**; Session defaults ↔ **§12.5** (template alignment); template cross-refs (**§12.2** prompts, **§12.5** code-quality tie) synced with `**development-plan-template`** + `**development-planner`**.                                     |
| 1.5     | **§12.5** expanded **0.5** manual matrix (incremental API/web/ops rows + execution note); **§8** manual-scenario bullet aligned; **§12.5** intro clarifies sign-off vs stage gate and **Related tickets** = **all** merged before a row is runnable/sign-offable. |
| 1.6     | **§12.5** manual procedure checklist + steps for matrix row 3 (upload sign URLs, **T5**/**T6**).                                                                                                                                                                  |
| 1.7     | **§12.4** **E1–E6** gate tightened: include **T22**, align reviewer scope to **§6.2**, and require explicit CI/coverage + security + release-checklist completion criteria.                                                                                       |


