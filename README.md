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
npm run db:prepare
```

Copy `.env.example` to `.env` and adjust (including **JWT_*** — the API will not start without them).

**Local JWT without your real IdP:** `.env.example` defaults match the built-in helper. In **one** terminal run:

```bash
npm run dev:local-auth
```

Leave it running. It listens on **127.0.0.1:3010** only, serves JWKS, and can mint a dev token at `http://127.0.0.1:3010/dev/token`. Then start the stack:

```bash
npm run dev
```

If the API still exits, confirm `.env` contains **`JWT_ISSUER`**, **`JWT_AUDIENCE`**, and **`JWT_JWKS_URI`** (the helper prints the exact lines). Production uses your platform issuer instead of this helper.

To run only one app (for example a second terminal is already running the other), use `npm run dev:api` or `npm run dev:web`.

- Web: default Vite URL (e.g. `http://localhost:5173`)
- API: `http://localhost:3000` — try `GET /health`

`apps/web` reads `VITE_API_URL` (see `.env.example`) for display and future fetches to the API.

`npm run db:prepare` is the standard local DB setup path on Windows: it provisions a local PostgreSQL dev cluster if needed, hardens it (`scram-sha-256`, localhost-only), preserves existing passworded DB URLs in `.env`, and runs Drizzle migrations.

`db:dev:setup` intentionally normalizes local DB targets to this repo standard (`localhost:55432`, `memories`, `memories_test`) so different projects on your machine do not share the same database by accident.

## Scripts (root)

| Script | Description |
| --- | --- |
| `npm run dev` | API + web in one terminal ([`concurrently`](https://www.npmjs.com/package/concurrently); prefixed logs `api` / `web`) |
| `npm run dev:local-auth` | Localhost JWKS + `/dev/token` mint (**127.0.0.1** only; run alongside `npm run dev` until you wire a real IdP) |
| `npm run dev:web` | Vite dev server for `apps/web` |
| `npm run dev:api` | API with hot reload (`tsx watch`) |
| `npm run db:dev:setup` | Provision/start hardened local PostgreSQL cluster and set DB URLs in `.env` when missing (Windows) |
| `npm run db:migrate` | Apply Drizzle migrations for `@memories/api` |
| `npm run db:prepare` | Run local DB setup then migrations (Windows standard flow) |
| `npm run build` | Build all workspaces that define `build` |
| `npm run lint` | ESLint in workspaces that define `lint` |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run test` | Tests (`@memories/api`, `@memories/shared`) |

## New project / template alignment

- Follow `NEW_PROJECT_CHECKLIST.md` for rules, `CODEOWNERS`, security contacts, and CI.
- `TEMPLATE_SYNC.md` explains staying aligned with `cursor-template` when you pull reusable changes.
- Run `.\scripts\verify-template.ps1` after renames; use `-Strict` when cleaning placeholders (e.g. `@your-org` in `.github/CODEOWNERS`).
- CI includes **`docs-smoke`** (`scripts/check-docs.sh`) plus **`checks`** (lint, typecheck, tests). In GitHub branch protection, require **`docs-smoke`** and **`checks`**, and the Security jobs you use (see `CONTRIBUTING.md`).
- DB migrates: `.github/workflows/migrate.yml` supports manual production runs and optional auto-on-`main` mode controlled by `ENABLE_AUTO_PROD_MIGRATE`; see `docs/infrastructure.md` (section 3).
- Git hooks (agent transcript archive): `git config core.hooksPath .githooks`. Set your Cursor transcript directory via `scripts/sync-agent-chats.local.env` (copy from `scripts/sync-agent-chats.local.env.example`) or `CURSOR_AGENT_TRANSCRIPTS_DIR`; see `docs/agent-chats/README.md`.

## License

See `LICENSE`.
