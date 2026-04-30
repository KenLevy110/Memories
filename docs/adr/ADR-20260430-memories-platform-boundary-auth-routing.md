# ADR-20260430-memories-platform-boundary-auth-routing

## Decision metadata

- **Decision ID:** `ADR-20260430-memories-platform-boundary-auth-routing`
- **Date:** 2026-04-30
- **Status:** Accepted
- **Owners:** Ken Levy (project lead; sign-off on product and technical decisions)
- **Related docs / issues / PRs:** [technical-design-v1.md](../technical-design-v1.md); [tech-stack.md](../tech-stack.md); [product-requirements-v1.md](../product-requirements-v1.md); [implementation-log.md](../implementation-log.md)
- **ADR index:** [README.md](README.md)
- **Template used:** `docs/templates/decision-log-template.md`

---

## Context

The Memories service must integrate with the broader Ohana platform (Dashboard, identity) while owning multimodal memory data, async transcription, and strict PHI handling. Prior documentation left system-of-record split, auth source, routing, realtime updates, authorization depth, and several pilot policies open.

---

## Decision

1. **System of record (split):** The **platform** (Dashboard and related services) remains **system of record** for Practice, User, Client, and `ClientAccess` / tenancy. **Memories** (`apps/api` + this repo’s PostgreSQL) is **system of record** for **Memory**, **MemoryMedia**, **MemoryTranscript**, upload/sign state, **transcription jobs**, and **memory-scoped audit events**. Tenant and subject identifiers are carried as **UUIDs** validated on each request (JWT claims and/or a minimal scope surface synced from the platform if claims alone are insufficient).

2. **Identity:** **Platform-issued JWT** (or equivalent bearer from the central IdP). Memories **verifies** tokens (e.g. JWKS); it **does not** own end-user login for the pilot slice described in the PRD.

3. **Authorization in Postgres:** **Application-layer checks** on every route and query (tenant + client access, aligned with handoff permission intent). **Postgres RLS** is **not** required for v1; it may be added later if the same database gains additional writers or direct SQL consumers.

4. **HTTP API surface:** Versioned prefix **`/api/v1/`**; **`clientId` in path** where the UI is client-scoped. Canonical routes—including explicit CRUD, upload/sign, transcript poll, playback signing, and alerting guidance—live in **[technical-design-v1.md](../technical-design-v1.md)** §§3.1–3.3.

5. **Capture draft lifecycle:** **Client-only** draft in **IndexedDB** until **`POST /api/v1/clients/:clientId/memories`** succeeds; **no** server-side draft PATCH for v1. **Idempotency** via `Idempotency-Key` (or equivalent) on create.

6. **Transcription pipeline:** **Job rows in PostgreSQL** (`pending` → `processing` → terminal states) plus a **worker** (separate process or scheduled runner) invoking the STT integration. **STT vendor** is chosen behind an **interface** once BAAs and cloud alignment allow; implementation uses **fake/stub adapters** in CI and local dev.

7. **Transcript status to the browser:** **Short-interval polling** on memory detail (and where “pending” UI is shown) for v1. **SSE** remains an optional later optimization.

8. **Web routing:** **TanStack Router**. Capture flow uses **one route** with **`?step=`** query values (`photo`, `meta`, `prompt`, `record`, `review`, `done`) for deep links and refresh resilience.

9. **ORM:** **Drizzle** for schema and migrations in this repo unless a future ADR changes it.

10. **Object storage:** **S3-compatible** storage; object keys **`{practice_id}/{memory_id}/{media_id}`** (document exact key rules in migrations or ops runbook as implementation lands). **Short-lived signed PUT/GET** from the API.

11. **LLM (`suggest_prompt`, future tags):** **Small internal interface**; **hard timeout ~1.8s** with **static fallback** copy; production vendor gated by **BAA** and org cloud preference; **stub in dev**.

12. **Pilot / product policy (documented in PRD and here for engineering):**
    - **Consumer / family capture:** **Room optional**; **Guide** flow keeps **name + room required** per PRD.
    - **Family access for pilot:** **Time-bound magic links / invites** rather than full account onboarding where product allows.
    - **Notifications:** **Generic** content only (no names, transcript snippets, or media references).
    - **Post-death / long-term retention:** **Legal/compliance** owns the policy; engineering provides **soft-delete**, export hooks, and **configurable retention** flags—no fixed retention period in code until policy is signed.

13. **Hosting posture:** **Managed PostgreSQL**, **S3-compatible object storage**, and **containerized** API/worker on the team’s chosen cloud (no multi-cloud requirement for v1).

14. **Memories UI placement:** **Primary UI in `apps/web`** for v1; Dashboard integrates via **shared auth**, **deep links**, and HTTP APIs—not by merging this frontend into the Dashboard repo unless product explicitly rescopes.

---

## Options considered

1. **Memories as full SoR** for Practice/Client/User (rejected for v1): high sync burden with Dashboard and duplicate source of truth.
2. **Postgres RLS from day one** (deferred): strong defense-in-depth but heavy policy and test matrix before first ship.
3. **SSE-first for transcripts** (deferred): better live UX but more operational complexity for pilot.
4. **Server-persisted capture drafts** (deferred): useful for multi-device resume; not needed for initial offline-first single-device capture.

---

## Trade-offs

- **Benefits:** Clear bounded context, faster v1 delivery, single identity story, testable app-layer authz, boring infra.
- **Risks:** App-only authz requires discipline and thorough tests; platform must supply trustworthy claims or scope sync; polling adds modest read load versus SSE.
- **Cost or complexity impact:** Worker + job table add operational components but avoid new queue infrastructure initially.

---

## Consequences

- Update [technical-design-v1.md](../technical-design-v1.md), [tech-stack.md](../tech-stack.md), and [product-requirements-v1.md](../product-requirements-v1.md) to match this ADR.
- Implementation and the development plan should trace authz checks and idempotency to this ADR.
- If the database gains a second writer or analytics with direct SQL, revisit **RLS** in a new ADR.

---

## Rollback / reversal plan

Revert by superseding this ADR: document new SoR split or auth model, migrate data if ownership changes, and update TDD/PRD in the same change. Platform JWT → Memories-issued sessions would require coordinated Dashboard and security review.
