# Memories

Monorepo for the **Memories** service: capture and preserve memories with **photos**, **recorded voice**, and **transcription** (to be implemented). The **Dashboard** and other products live in separate repositories; this repo is only **Memories** (Node + TypeScript API, React + TypeScript web, shared contracts).

## Layout

| Path | Role |
| --- | --- |
| `apps/web` | React (Vite) — `@memories/web` |
| `apps/api` | Node/TypeScript HTTP API — `@memories/api` |
| `packages/shared` | Shared Zod types and constants — `@memories/shared` |
| `docs`, `.cursor` | Product docs, Cursor rules and skills (from the Ohana template) |

## Prereqs

- **Node.js 22+** (see `.nvmrc`)
- `npm` (workspaces at repo root)

## Quick start

```bash
cd C:\Users\Ken Levy\OneDrive\Documents\Business\Ohana\Memories
npm install
```

Copy `.env.example` to `.env` and adjust. In one terminal start the API, in another the web app:

```bash
npm run dev:api
# other terminal
npm run dev:web
```

- Web: default Vite URL (e.g. `http://localhost:5173`)
- API: `http://localhost:3000` — try `GET /health`

`apps/web` reads `VITE_API_URL` (see `.env.example`) for display and future fetches to the API.

## Scripts (root)

| Script | Description |
| --- | --- |
| `npm run dev:web` | Vite dev server for `apps/web` |
| `npm run dev:api` | API with hot reload (`tsx watch`) |
| `npm run build` | Build all workspaces that define `build` |
| `npm run lint` | ESLint in workspaces that define `lint` |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run test` | Tests (`@memories/api`, `@memories/shared`) |

## New project / template alignment

- Follow `NEW_PROJECT_CHECKLIST.md` for rules, `CODEOWNERS`, security contacts, and CI.
- `TEMPLATE_SYNC.md` explains staying aligned with `cursor-template` when you pull reusable changes.
- Run `.\scripts\verify-template.ps1` after renames; use `-Strict` when cleaning placeholders (e.g. `@your-org` in `.github/CODEOWNERS`).
- CI includes **`docs-smoke`** (`scripts/check-docs.sh`) plus **`checks`** (lint, typecheck, tests). In GitHub branch protection, require **`docs-smoke`** and **`checks`**, and the Security jobs you use (see `CONTRIBUTING.md`).
- Optional DB migrates: `.github/workflows/migrate.yml` (manual dispatch); defaults and secrets are described in `docs/infrastructure.md` (section 3).
- Git hooks (agent transcript archive): `git config core.hooksPath .githooks`. Set your Cursor transcript directory via `scripts/sync-agent-chats.local.env` (copy from `scripts/sync-agent-chats.local.env.example`) or `CURSOR_AGENT_TRANSCRIPTS_DIR`; see `docs/agent-chats/README.md`.

## License

See `LICENSE`.
