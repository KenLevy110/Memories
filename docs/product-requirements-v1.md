# Memories — product requirements

## Document control


| Field                   | Value                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Author**              | Ken Levy                                                                                                                                                                                                                                                                                                                                               |
| **PM / owner**          | Ben Cerezo                                                                                                                                                                                                                                                                                                                                             |
| **Reviewers**           | Engineering, design, compliance (PM to confirm reviewers)                                                                                                                                                                                                                                                                                            |
| **Status**              | Approved                                                                                                                                                                                                                                                                                                                                               |
| **Version**             | 1.2                                                                                                                                                                                                                                                                                                                                                    |
| **Edition**             | **v1** — filename `product-requirements-v1.md`. Breaking rewrites: new file (`-v2.md`, …). Minor edits: same file + revision note below.                                                                                                                                                                                                              |
| **Last updated**        | 2026-04-30                                                                                                                                                                                                                                                                                                                                             |
| **Template used**       | `.cursor/skills/product-manager/reference.md`; `docs/templates/product-requirements-template.md` (control table)                                                                                                                                                                                                                                       |
| **Related docs**        | [README.md](../README.md); [tech-stack.md](tech-stack.md); [memories-user-workflow-v1.md](memories-user-workflow-v1.md); [technical-design-v1.md](technical-design-v1.md) **v1.2** (Approved); [design-wireframe-v1.md](design-wireframe-v1.md); [implementation-log.md](implementation-log.md); [adr/README.md](adr/README.md); [Prototype Backend Engineering Handoff.md](Prototype%20Backend%20Engineering%20Handoff.md); next: publish [development-plan.md](development-plan.md) after specs lock |
| **External references** | [Notion mirror](https://plump-cheddar-f44.notion.site/Prototype-Backend-Engineering-Handoff-349fc9f5d1f880968428eac8506f728a?pvs=73) — **authoritative:** repo handoff markdown above                                                                                                                                                                  |


### Workflow visuals

Hi-fi **screenshots**, **mermaid**, **ASCII**, and step→FR trace: **[memories-user-workflow-v1.md](memories-user-workflow-v1.md)**. **Primary capture/table + canonical HTTP route addendum**: **[technical-design-v1.md](technical-design-v1.md)** Sections 3.1–3.2. **Empty / error / offline** low-fi wireframes: **[design-wireframe-v1.md](design-wireframe-v1.md)** (paired with WCAG-aligned implementation notes summarized in **[technical-design-v1.md](technical-design-v1.md)** §7).

---

## Executive summary

**Ship** the **Memories** subsystem in this monorepo: multimodal memories (images, audio, text, transcripts), **aligned** with the [Ohana Way prototype handoff](Prototype%20Backend%20Engineering%20Handoff.md) for data shape, capture resilience, and HIPAA-oriented handling of memory PHI. **Do not** implement the full pilot (dashboard, inbox, AI Guide shell, practice admin) here—integrate via contracts.

The experience must be a **very simple app**—minimal steps, plain language, large controls, and obvious feedback—so **elders** (clients and family who use the UI directly) are not blocked by complexity. Prefer depth in **content** (the memory itself), not in **chrome** or secondary features on core paths.

**Success:** Authorized users capture and retrieve memories without **losing work** to flaky connectivity (client-owned queue/retry); media and transcripts are **access-controlled**; logs carry **no PHI content**; primary flows stay **easy for older adults** to complete (NFR-012); requirements stay traceable via **FR-** / **NFR-** IDs.

**Risks:** BAA/vendor lead time; offline capture engineering cost—mitigated via explicit **Memories**/Dashboard **system-of-record** split documented in **[ADR-20260430-memories-platform-boundary-auth-routing.md](adr/ADR-20260430-memories-platform-boundary-auth-routing.md)** and **[technical-design-v1.md](technical-design-v1.md)** §2.

---

## Background & scope boundary

**Ohana Way** (handoff) is the Guide-facing PWA and platform story—**Memory Capture** during visits, **Practice** multi-tenancy, **Client** vs **User**, `ClientAccess` RBAC, HIPAA, pilot MVP (handoff Section 12.1). **This repo** is the **memory vertical** ([README](../README.md)): web + API + shared contracts, eventually surfaced from a broader **Dashboard**.

**In this repo (near-term):** memory CRUD; list/detail; **MemoryMedia** (multiple) + **MemoryTranscript** (separate from blobs); signed uploads → server assigns `memory_id`; async transcription + UI states; idempotent save + **offline-tolerant** client retry (handoff Sections 2.5, 5.1); optional **suggest_prompt** + fallback (Section 6.2); phased tag suggestions, reactions/comments, `sharing_visibility`; audit events for memory PHI writes (Sections 4.4, 8.3).

**Elsewhere (cross-repo / pilot):** auth + MFA, G1/G2/G3, G6 inbox, G4 AI Guide **UI**, family invite/onboarding flows, Web Push orchestration, full RLS story if identity lives outside this service—**contracts** must still match handoff Sections 4, 7–8.

**Out of scope (near-term):** telephony/video, practice analytics dashboard, PDF memory book (handoff Section 12.2–12.3). **Non-goals:** native apps (PWA/browser first); SMS notifications; building full pilot **inside** this repo unless explicitly rescoped.

**Dependencies:** BAAs before prod PHI (Section 8.5); STT pick (Sections 3.4, 13.1); Dashboard/identity claims (`practice_id`, `user_id`, `client_id`, roles).

---

## Problem & goals

**Problem:** Moments split across camera rolls, voice memos, and notes; **Ohana Way** adds risk of **losing** irreplaceable on-site captures without resilient upload behavior.

**Goals:** (1) Create/view/list memories with images, audio, text, and async transcripts + clear states. (2) Model matches handoff **Memory / MemoryMedia / MemoryTranscript** (Section 4.2). (3) Capture path resilient to connectivity (Section 5.1). (4) **Security / privacy:** treat memory content as **sensitive PII/PHI** (e.g. names, voice, photos, transcripts, family context—handoff Section 8.1): strong access control, encryption in transit (and at rest per TDD), BAAs where required, audit, **no sensitive content in logs or analytics**, AI handling per NFR-009 (Sections 8–11). (5) **Mobile-first:** primary flows (especially capture and review) **optimized for phone** first; desktop remains first-class unless product reprioritizes. (6) **Elder-friendly simplicity:** the app stays **very simple**—few choices per screen, readable typography, forgiving errors—so elders are the design baseline, not power users (NFR-012). (7) Prompt suggestion **p95 under 2s** with safe fallback (Section 6.2).

---

## Users


| Segment                    | Notes                                                                                                                                              | Priority                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Guide**                  | Captures for client (Ohana Way)                                                                                                                    | Primary when this backs Guide flows |
| **Memory keeper / family** | Consumer / Dashboard framing                                                                                                                       | Primary when that mode ships first  |
| **Client (elder)**         | Subject of care; when they use the UI (now or later), flows must stay **very simple** (NFR-012). Often not a User in v1; access via `ClientAccess` | Subject                             |
| **Family**                 | Read / limited write per matrix (Section 7.2)                                                                                                      | Phased                              |


Do not ship **user_id–only** authz that cannot grow into `ClientAccess`-shaped rules.

---

## Solution (one paragraph)

A **Memory** is metadata (e.g. name, room; optional era/valence per Section 4.3) plus **media** in object storage, **transcript** rows, optional **tags**, and later **reactions/comments** (C4). **UI principle:** default surfaces stay **sparse and obvious** so elders are never required to parse dense controls to save or replay a memory. Flows: handoff **Memory Capture** (Section 5.1); async STT + optional tag pass (Sections 5.1, 6.3); detail playback; future **Dashboard** deep-link with same identity/tenant context.

---

## Key scenarios (compressed)

1. **Guide capture:** Photo → name + room → AI prompt (or fallback) → record → review → save → list; transcript and optional tags later; offline → queued retry.
2. **Transcription:** pending → ready/failed without corrupting other fields; optional tag accept/reject.
3. **Family:** Read/edit comments per Appendix A matrix (**FR-017** groundwork); autonomous **create/delete** remains **disabled in MVP**—enable only via explicit Appendix A revision + JWT claim support from Dashboard.
4. **Dashboard (future):** Authenticated user sees only authorized library.

---

## Functional requirements


| ID         | Requirement                                                                                                    | P   | Notes                               |
| ---------- | -------------------------------------------------------------------------------------------------------------- | --- | ----------------------------------- |
| **FR-001** | Create memory (scoped to authorized client/tenant).                                                            | P0  | Tenant fields in TDD                |
| **FR-002** | View detail: text + media + transcript when ready.                                                             | P0  |                                     |
| **FR-003** | Update allowed fields per Section 7.2 matrix.                                                                  | P0  | Per-role fields in TDD              |
| **FR-004** | Delete where policy allows + confirm.                                                                          | P1  | Family may not delete (Section 7.2) |
| **FR-005** | One or more images as **MemoryMedia**.                                                                         | P0  | Section 4.2                         |
| **FR-006** | Audio attach + playback; STT-friendly format (e.g. AAC/M4A).                                                   | P0  | Section 5.1                         |
| **FR-007** | Text fields with limits; **name + room** required in **Guide** flow; **room optional** in consumer / family capture (signed off 2026-04-30 — Ken Levy).              | P0  | Section 5.1; [ADR-20260430](adr/ADR-20260430-memories-platform-boundary-auth-routing.md)                         |
| **FR-008** | Async transcription → **MemoryTranscript** (+ confidence if vendor).                                           | P0  | Sections 4.2, 5.1, 12.1             |
| **FR-009** | Transcription UI: pending / ready / failed.                                                                    | P0  |                                     |
| **FR-010** | List with cursor pagination (~20), recency default.                                                            | P0  | Section 5.5                         |
| **FR-011** | Reject bad media clearly; ~2000px client resize target in capture.                                             | P0  | Section 5.1                         |
| **FR-012** | Authz on every read/write: tenant + `ClientAccess` analog.                                                     | P0  | Sections 7.3–7.4; RLS vs app in TDD |
| **FR-013** | Idempotent create-after-upload (no duplicate memories on retry).                                               | P0  | Section 5.1                         |
| **FR-014** | Offline-tolerant save: retain artifacts, retry (e.g. backoff, up to 24h window per handoff).                   | P0  | Sections 2.5, 5.1, 12.1             |
| **FR-015** | `suggest_prompt`-style API: minimal context in, one question or fallback on failure/timeout; **p95 under 2s**. | P1  | Section 6.2                         |
| **FR-016** | Post-transcript tag suggestions; accept/reject → **MemoryTag**.                                                | P2  | Sections 6.3, 12.2                  |
| **FR-017** | Reactions + comments on detail per roles.                                                                      | P1  | Section 12.1, C4                    |
| **FR-018** | `sharing_visibility` (or equivalent) before broad family defaults.                                             | P2  | Sections 4.3, 13.2                  |
| **FR-019** | Audit PHI-bearing memory creates/updates/deletes.                                                              | P0  | Sections 4.4, 8.3                   |


*P = P0 launch-critical / P1 important / P2 follow-on.*

---

## Stories & acceptance (summary)

- **CRUD / list:** Given Guide with client access, after successful capture save → memory appears in paginated list with correct metadata and media. Given Family with visibility, opening memory shows media + transcript, not practice-only artifacts (e.g. GuideNote—outside Memories scope).
- **Resilient save:** Given failed upload/API, client retries per TDD without duplicate rows (**FR-013**).
- **Transcription / tags:** Transcript states per **FR-009**; optional tag flow per **FR-016**.
- **Elder-friendly:** A first-time or low-tech **elder** can complete **capture** and **playback** paths without extra coaching beyond short copy on screen (NFR-012); validate with usability sessions when feasible.

---

## Non-functional requirements


| ID          | Category          | Requirement                                                                                                                                                                                                                                                                                                                        | P   | Notes                                                                    |
| ----------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------------------------------------------ |
| **NFR-001** | Security          | HTTPS in prod (TLS 1.2+, prefer 1.3).                                                                                                                                                                                                                                                                                              | P0  | Section 8.2                                                              |
| **NFR-002** | Privacy           | Signed URLs / least privilege; no anonymous access to memory **PII/PHI** (media, transcripts, metadata that identifies people).                                                                                                                                                                                                    | P0  | Sections 3.3, 8.1                                                        |
| **NFR-003** | Reliability       | Health + structured errors; SLOs in TDD.                                                                                                                                                                                                                                                                                           | P1  | Section 11                                                               |
| **NFR-004** | A11y              | WCAG 2.2 AA intent on primary flows; complements **NFR-012** (readable contrast, focus order, labels).                                                                                                                                                                                                                             | P1  |                                                                          |
| **NFR-005** | Performance       | Prompt **p95 under 2s**; async STT 30s–3m acceptable.                                                                                                                                                                                                                                                                              | P1  | Sections 5.1, 6.2                                                        |
| **NFR-006** | Observability     | Request correlation + service-level dashboards/alerts owned by Memories API (infra provider or SaaS APM); **metadata-only** logs—no transcript/audio/content. Operational thresholds tracked with engineering (see **[technical-design-v1.md](technical-design-v1.md)** §3.3).                                                                                                                                                                                                                                                           | P0  | Sections 5.1 PHI, 11.1                                                 |
| **NFR-007** | Compliance        | BAAs before prod for all PHI-touching vendors.                                                                                                                                                                                                                                                                                     | P0  | Section 8.5                                                              |
| **NFR-008** | Compliance        | Audit PHI-bearing mutations in Memories (`audit_events`); capture authz denial telemetry with correlation IDs. Broader SIEM ingestion may remain platform-led, but Memories must expose queryable denial signals for investigations.                                                                                                                                                                 | P0  | Section 8.3; aligns with **[technical-design-v1.md](technical-design-v1.md)** §7 |
| **NFR-009** | Security          | AI injection defenses; human confirm for privileged actions.                                                                                                                                                                                                                                                                       | P0  | Section 6.5                                                              |
| **NFR-010** | Ops               | Monitor upload/AI failure rates with alerts owned by Memories service dashboards (staging + prod), synchronized with infra on-call rotations; aligns with **[technical-design-v1.md](technical-design-v1.md)** §3.3 + handoff Section 11.3.                                                                                                                                                            | P1  | Detailed thresholds recorded in forthcoming `development-plan.md`           |
| **NFR-011** | Quality / testing | P0 flows (capture, save/idempotency, authz on memory reads/writes) have **automated tests** meeting repo policy (see [AGENTS.md](../AGENTS.md)); critical paths have **manual or E2E** verification before closed-pilot launch—details in `development-plan.md` / TDD, not duplicated here.                                        | P1  | PRDs often state *that* quality is required; *how* stays in plan + stack |
| **NFR-012** | Elder-friendly UX | The app is **very simple** by design: **minimal** choices per step on capture/list/detail, **plain-language** labels and errors, **large** touch targets, one obvious primary action per screen where practical, and **no** dependency on hidden gestures for core tasks. Mirror **[design-wireframe-v1.md](design-wireframe-v1.md)** states for elders; secondary power features must not clutter default paths. | P0  | Reinforced by **[technical-design-v1.md](technical-design-v1.md)** §7 accessibility bullets |


---

## Analytics, GTM, migration

- **Metrics (proposal):** Captures per active client, transcription success rate, upload retry rate, prompt latency, list p95 (Section 11.2). Events: generic/redacted payloads until PHI policy decided (Section 10.3).
- **Pilot launch (this service’s slice):** Resilient capture, storage, transcript, detail, observability hooks—subset of Section 12.1. Audience: handoff pilot scale (Section 1.3).
- **Migration:** Forward migrations; soft-delete preference (Sections 4.4, 9.6). Ops: backups/restore per Section 11.4—often platform-owned.

---

## Milestones, risks, open questions

**Milestones:** [technical-design-v1.md](technical-design-v1.md) **v1.2 (Approved)** enumerates MVP HTTP routes (**§3.2**), observability playbook (**§3.3**), transcript polling contract, JWT hardening checklist, and Appendix A MVP clarifications, while STT eval (~20 samples, Section 3.4) runs in parallel. Cross-product MVP pilot Section 12.1 remains TBD (~3–6 mo order-of-magnitude, Section 12.4). **Development plan publishing** intentionally follows final TDD lock—track sequencing + RACI there once published.

**Risks:** BAA lead time → parallel legal + synthetic staging (Sections 8.5–8.6); offline capture cost → timeboxed spike (Section 12.4); repo boundary → explicit contracts in TDD; PHI in notifications/logs → generic notifications + redaction (Sections 10.3, 11.1).

**Resolved (2026-04-30, Ken Levy sign-off):** Former open questions are decided in **[ADR-20260430-memories-platform-boundary-auth-routing.md](adr/ADR-20260430-memories-platform-boundary-auth-routing.md)** and **[technical-design-v1.md](technical-design-v1.md) v1.2**. Summary: (1) **Split SoR** — platform owns Practice/User/Client/`ClientAccess`; Memories owns memory tables, jobs, memory audit. (2) **STT** — adapter + vendor per BAA (stub in dev). (3) **Cloud** — managed Postgres + S3-compatible storage + containers on chosen cloud; Fastify remains the API runtime. (4) **Room** — required for Guide; optional for consumer/family capture. (5) **Family MVP** — read + limited comment interactions aligned with Appendix A; autonomous create/delete remain off unless explicitly rescoped (**FR-017** groundwork documented in **[technical-design-v1.md](technical-design-v1.md)** Appendix A notes). (6) **Notifications** — generic only (no PHI in payloads). (7) **Death / retention** — legal owns policy; engineering ships soft-delete, export hooks, configurable retention (no fixed years in code until compliance signs). (8) **Magic links / invite flows** remain platform-owned time-bound accesses when cohort policy requires passwordless onboarding.

**Still environment-specific (not product ambiguity):** finalized JWT claim names + rotation calendar; chosen STT/LLM vendors/instances once BAAs complete; horizontal scaling targets for transcription workers—instrument via `development-plan.md` owners/dates immediately after drafting.

**AI-assisted delivery norms:** bots may author code, yet **humans/agents still log decision owners + target-by dates** whenever an item blocks merges (JWT schema freeze, alerting ownership, infra quotas). Omit dates only when work is exploratory/internal.

---

## Appendix

**Glossary:** **Ohana Way** — full product (handoff). **Memory Capture** — four-step flow (Section 5.1). **Practice / Client / ClientAccess** — tenant + access (Section 4). **Memory / MemoryMedia / MemoryTranscript** — persistence (Section 4.2).

**References:** [Prototype Backend Engineering Handoff.md](Prototype%20Backend%20Engineering%20Handoff.md); [Notion](https://plump-cheddar-f44.notion.site/Prototype-Backend-Engineering-Handoff-349fc9f5d1f880968428eac8506f728a?pvs=73); [README](../README.md); [tech-stack.md](tech-stack.md).

---

## Revision (file)

| File revision | Date | Summary |
| --- | --- | --- |
| v1 | 2026-04-22 | Renamed to `product-requirements-v1.md`; content PRD 1.0 |
| v1.1 | 2026-04-30 | Closed prior “open questions” via ADR-20260430 + TDD 1.1; FR-007 room rule clarified |
| v1.2 | 2026-04-30 | Elevated PRD/TDD alignment—Approved pairing with **[technical-design-v1.md](technical-design-v1.md)** **v1.2** (route addendum, observability playbook, JWT posture, clarified family MVP) |

---

## Handoff

Maintain **[technical-design-v1.md](technical-design-v1.md)** (FR/NFR traceability, handoff cites, **NFR-012**) and **[design-wireframe-v1.md](design-wireframe-v1.md)** as UI evolves. Run **development-planner** for execution slices. Keep handoff revs in sync under **Related docs**.