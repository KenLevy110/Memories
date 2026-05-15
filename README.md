# Legacy

Product (**Legacy**): capture and preserve what matters with **photos**, **recorded voice**, and **transcription** (to be implemented). The **Dashboard** and other platform apps live in separate repositories; this repo ships the Legacy vertical (**npm** workspaces `@memories/*`, Node + TypeScript API, React + TypeScript web, shared contracts).

## Spec-driven delivery (SDD)

Delivery is **spec-driven**: editioned product and technical docs in `docs/` (`product-requirements-v1.md`, `technical-design-v1.md`, `development-plan-v1.md`, wireframes) sequence work before deep implementation; agents follow `AGENTS.md` and **`.cursor/skills/`** for authoring and lane implementation.

## Layout

| Path | Role |
| --- | --- |
| `apps/web` | React (Vite) — `@memories/web` |
| `apps/api` | Node/TypeScript HTTP API — `@memories/api` |
| `packages/shared` | Shared Zod types and constants — `@memories/shared` |
| `brand` | Logo masters and brand notes ([`brand/README.md`](brand/README.md)); sync favicon/PWA from here into `apps/web/public/` |
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

Copy `.env.example` to `.env` and adjust (including **JWT_*** — the API will not start without them). Tracked **`.env.local.example`** is the **standalone** template; copy it to **`.env.local`** (gitignored) only when you use standalone mode.

`MEMORIES_ENV_PROFILE` in **`.env`** (or exported in your shell before `npm run dev`) selects how **`.env.local`** is used:

| Profile | Meaning |
| --- | --- |
| **`dashboard`** (default) | **`.env`** is the full Dashboard integration contract. **`.env.local` is not loaded** by the API, Drizzle, or the Firebase claims script, so a leftover standalone file cannot override ports or JWT. Vite reads `VITE_*` only from **`.env`** (see `apps/web/vite.config.ts`). |
| **`standalone`** | **`.env.local`** is merged after **`.env`** (overlapping keys win). Use with **`npm run dev:local-auth`** and the values in **`.env.local.example`**. |

Confirm every key from `.env.example` is declared where `npm run check:env` expects: **`.env` only** in dashboard mode, or **`.env` + `.env.local`** in standalone mode.

```bash
npm run check:env
```

### Local dev modes (summary)

| | **Dashboard** (`MEMORIES_ENV_PROFILE=dashboard`) | **Standalone** (`MEMORIES_ENV_PROFILE=standalone`) |
| --- | --- | --- |
| **Repo-root `.env`** | Full wiring: API **9090**, web **5174**, JWT → Dashboard **3000** JWKS | Base secrets / `DATABASE_URL`; must set profile to `standalone` |
| **`.env.local`** | Ignored by loaders (safe to keep a template on disk; do not set conflicting `VITE_*` if you edit Vite behavior) | **Required** for standalone ports/JWT (copy **`.env.local.example`**) |
| **Memories API** | `http://localhost:9090` | `http://localhost:3000` |
| **Memories web** | `http://localhost:5174` | `http://localhost:5173` |
| **JWT / token** | Dashboard `http://localhost:3000/.well-known/jwks.json`, token from Dashboard `/dev/token` | `npm run dev:local-auth` → `http://127.0.0.1:3010/dev/token` |

**Manual switch (mode A):** set **`MEMORIES_ENV_PROFILE`** in **`.env`** to `dashboard` or `standalone`, then start or stop **`npm run dev:local-auth`** as required. **Do not** run `dev:local-auth` while the profile is `dashboard` with Dashboard JWT in **`.env`**.

**Profile flag (mode B):** same variable — no file rename required for the API; Vite follows the profile so Dashboard web config is not overridden by a stray **`.env.local`** `VITE_*` entry.

#### Dashboard + sibling Dashboard repo

1. Keep **`MEMORIES_ENV_PROFILE=dashboard`** (or unset; it defaults to dashboard when the key is absent).
2. Start **Memories** first (`npm run dev`), then **Dashboard** (`npm run dev` in `../Dashboard`). See [`../Dashboard/README.md`](../Dashboard/README.md) and `npm run smoke:connectivity:local`.
3. Verify: `GET http://localhost:9090/health` and `GET http://localhost:3000/.well-known/jwks.json`.

#### Standalone Memories only

1. Set **`MEMORIES_ENV_PROFILE=standalone`** in **`.env`**.
2. Copy **`.env.local.example`** → **`.env.local`** and adjust if needed.
3. Run **`npm run dev:local-auth`** in one terminal; **`npm run dev`** in another.
4. Verify: `GET http://localhost:3000/health` → `{"status":"ok",...}`.

`npm run dev:clean` reads repo-root **`.env`** (and **`.env.local`** for `PORT` only when `MEMORIES_ENV_PROFILE=standalone`) and clears the **Memories API** port plus the **Vite** port for the active profile (**5174** dashboard, **5173** standalone). It does **not** stop Dashboard on **3000** unless your `.env` sets `PORT=3000` for the Memories API.

---

If the API exits on startup, confirm **`JWT_ISSUER`**, **`JWT_AUDIENCE`**, and **`JWT_JWKS_URI`** match the active profile (Dashboard vs `dev:local-auth`). Production uses your platform issuer (Firebase or Dashboard), not the local helpers.

To run only one app (for example a second terminal is already running the other), use `npm run dev:api` or `npm run dev:web`.

`apps/web` reads `VITE_API_URL` (see `.env.example`) for display and API fetches.

`npm run db:prepare` is the standard local DB setup path on Windows: it provisions a local PostgreSQL dev cluster if needed, hardens it (`scram-sha-256`, localhost-only), preserves existing passworded DB URLs in `.env`, and runs Drizzle migrations.

`db:dev:setup` intentionally normalizes local DB targets to this repo standard (`localhost:55432`, `memories`, `memories_test`) so different projects on your machine do not share the same database by accident.

## Scripts (root)

| Script | Description |
| --- | --- |
| `npm run dev` | Uses `scripts/run-dev.mjs` to clear API/web dev ports, then start API + web in one terminal ([`concurrently`](https://www.npmjs.com/package/concurrently); prefixed logs `api` / `web`) |
| `npm run dev:clean` | Clear Memories dev ports derived from **`.env`** / profile (see above) before `npm run dev` |
| `npm run dev:local-auth` | Localhost JWKS + `/dev/token` (**127.0.0.1** only). Use only with **`MEMORIES_ENV_PROFILE=standalone`** — do not run against Dashboard JWT in **`.env`**. |
| `npm run dev:web` | Vite dev server for `apps/web` |
| `npm run dev:api` | API with hot reload (`tsx watch`) |
| `npm run db:dev:setup` | Provision/start hardened local PostgreSQL cluster and set DB URLs in `.env` when missing (Windows) |
| `npm run db:migrate` | Apply Drizzle migrations for `@memories/api` |
| `npm run db:prepare` | Run local DB setup then migrations (Windows standard flow) |
| `npm run build` | Build all workspaces that define `build` |
| `npm run lint` | ESLint in workspaces that define `lint` |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run test` | Tests (`@memories/api`, `@memories/shared`) |
| `npm run test:e2e` | Playwright API checks in `@memories/api` (e.g. development-plan 12.5 / T8 finalize); first run may need `npm run test:e2e:install -w @memories/api` |

## New project / template alignment

- Follow `NEW_PROJECT_CHECKLIST.md` for rules, `CODEOWNERS`, security contacts, and CI.
- `TEMPLATE_SYNC.md` explains staying aligned with `cursor-template` when you pull reusable changes.
- Run `.\scripts\verify-template.ps1` after renames; use `-Strict` when cleaning placeholders (e.g. `@your-org` in `.github/CODEOWNERS`).
- CI includes **`docs-smoke`** (`scripts/check-docs.sh`) plus **`checks`** (lint, typecheck, unit tests, and `npm run test:e2e` when present). In GitHub branch protection, require **`docs-smoke`** and **`checks`**, and the Security jobs you use (see `CONTRIBUTING.md`).
- DB migrates: `.github/workflows/migrate.yml` supports manual production runs and optional auto-on-`main` mode controlled by `ENABLE_AUTO_PROD_MIGRATE`; see `docs/infrastructure.md` (section 3).
- Git hooks (agent transcript archive): **`npm install`** runs **`prepare`** to set **`core.hooksPath`** to **`.githooks`** when not in CI; override transcript path only if needed via **`scripts/sync-agent-chats.local.env`** or **`CURSOR_AGENT_TRANSCRIPTS_DIR`** (see **`docs/agent-chats/README.md`** — auto-discovery covers typical Cursor setups).

## License

See `LICENSE`.
