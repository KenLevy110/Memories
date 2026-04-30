# Memories — technology stack

## Document control

| Field | Value |
| --- | --- |
| **Status** | Approved |
| **Last updated** | 2026-04-30 |
| **Service** | Memories (photos, voice, transcription) |
| **Sign-off** | Ken Levy (project lead) |
| **Related** | [product-requirements-v1.md](product-requirements-v1.md); [technical-design-v1.md](technical-design-v1.md); [design-wireframe-v1.md](design-wireframe-v1.md); [memories-user-workflow-v1.md](memories-user-workflow-v1.md); [development-plan-v1.md](development-plan-v1.md); [development-plan.md](development-plan.md) (pointer); [infrastructure.md](infrastructure.md); [adr/ADR-20260430-memories-platform-boundary-auth-routing.md](adr/ADR-20260430-memories-platform-boundary-auth-routing.md); [Prototype Backend Engineering Handoff.md](Prototype%20Backend%20Engineering%20Handoff.md) |

## Locked decisions (this repo)

| Area | Choice |
| --- | --- |
| **Monorepo** | `apps/web` (React + Vite + TypeScript), `apps/api` (Node + TypeScript), `packages/shared` (Zod + shared types) |
| **API runtime** | Node.js + TypeScript; HTTP via **Fastify**; REST under **`/api/v1/`** |
| **Web** | **React** + **Vite** + TypeScript; routing via **TanStack Router**; capture flow **`/clients/:clientId/capture?step=…`** |
| **Shared contracts** | **Zod** in `@memories/shared` — extend as features land |
| **Database** | **PostgreSQL** with **Drizzle** (migrations + queries) when persistence is added |
| **Auth with Dashboard / platform** | **Platform-issued JWT** verified by `apps/api` (JWKS or equivalent); claims encode **practice + client scope + role** (**Guide** may have many **`client_id`s**; **client-self** narrow to one)—see **[technical-design-v1.md](technical-design-v1.md)** §2; Memories does not own IdP |
| **System of record** | **Platform:** Practice, User, Client, `ClientAccess`. **Memories DB:** Memory, MemoryMedia, MemoryTranscript, jobs, memory-scoped audit (see ADR) |
| **Object storage** | **S3-compatible**; short-lived signed PUT/GET; keys **`{practice_id}/{memory_id}/{media_id}`** (see TDD §5) |
| **Transcription** | **Postgres-backed job rows** + worker; **STT vendor** behind an adapter, **BAA-gated** for prod; **client poll** for transcript status in v1 |
| **LLM (`suggest_prompt` / tags)** | Internal adapter; **~1.8s** timeout + static fallback; vendor per BAA; stub in dev |
| **Memories UI vs Dashboard** | **Primary UI in `apps/web`** for v1; Dashboard integrates via same auth, deep links, and HTTP APIs |
| **Authorization in DB** | **Application-layer** checks v1 (RLS optional later per ADR) |
| **Hosting (v1)** | Managed Postgres + object storage + containers on the chosen cloud (no multi-cloud requirement) |
| **Platform integration** | **Dashboard** and other services are **separate repositories**; integrate over HTTPS with shared auth |

## Open (vendor / environment specific)

- Exact **JWT claim** names and optional **client scope sync** mechanism (coordinate with Dashboard).
- **STT and LLM vendor** instances once legal BAAs and cloud region are fixed.
- **Worker hosting** (same container as API vs separate process)—operational choice, not product ambiguity.

When vendor or claim contracts change, update `technical-design-v1.md` and this file in the same PR.
