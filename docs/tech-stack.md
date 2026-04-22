# Memories — technology stack

## Document control

| Field | Value |
| --- | --- |
| **Status** | draft |
| **Last updated** | 2026-04-22 |
| **Service** | Memories (photos, voice, transcription) |
| **Related** | Fill from `docs/templates/` as PRD and technical design are written |

## Locked decisions (this repo)

| Area | Choice |
| --- | --- |
| **Monorepo** | `apps/web` (React + Vite + TypeScript), `apps/api` (Node + TypeScript), `packages/shared` (Zod + shared types) |
| **API runtime** | Node.js + TypeScript; HTTP via **Fastify** |
| **Web** | **React** + **Vite** + TypeScript |
| **Shared contracts** | **Zod** in `@memories/shared` — extend as features land |
| **Database** | **PostgreSQL** when persistence is added (Drizzle or Prisma per team preference) |
| **Platform integration** | **Dashboard** and other services are **separate repositories**; they integrate with this API over HTTP and shared auth as you define it |

## Open (decide in PRD / TDD)

- Auth model with the **Dashboard** (e.g. JWT, session from platform IdP, or API keys for server-to-server)
- Object storage (S3-compatible) and signed upload flow
- Transcription provider and async job shape (queue, webhooks, polling)
- How much of the Memories UI is embedded in Dashboard vs. standalone in this `apps/web` app

When these are locked, align `AGENTS.md`, CI, and the templates under `docs/templates/`.
