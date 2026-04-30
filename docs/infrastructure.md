# Memories infrastructure

## 1. Document control

| Field | Value |
| --- | --- |
| **Purpose** | Where production-related services live and how operators sign in (no credentials in git). |
| **Owner** | Eng/Ops |
| **Last updated** | 2026-04-30 |

This document is a **vendor map** only. **Do not** store API keys, database URLs, provider keys, session secrets, or recovery codes here — use a password manager, your host’s service variables, and **GitHub Actions** repository secrets.

**Starter template (`cursor-template`) vs deployed app:** The repository’s default [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **documentation smoke checks** and **optional root `npm` scripts** only. It **does not** run **`db:migrate`** or connect to PostgreSQL. [`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) provides **manual** migrations (`workflow_dispatch`) once a monorepo and secrets exist. Section 3 below describes **optional** automation (for example migrate on push to `main`) in addition to that workflow.

## 2. Providers and roles

| Provider | Role | Access |
| --- | --- | --- |
| **GitHub** | Source repository; **Actions** — [`ci.yml`](../.github/workflows/ci.yml) (docs + optional Node); [`migrate.yml`](../.github/workflows/migrate.yml) (manual DB migrate when the API workspace defines `db:migrate`); **Security** workflow. | GitHub account with repo access. |
| **App host / DB** | **TBD** when Memories is deployed (for example Railway, Fly.io, AWS, Azure). API **HTTP health check** should match the path documented in [technical-design-v1.md](technical-design-v1.md) (today: **`GET /health`** on `apps/api`). | Operator access to the chosen platform. |
| **DNS / TLS** | Public hostname(s) and certificates for API and web as you define them. | Registrar or DNS provider account. |
| **Email / STT / LLM** | Chosen vendors for transactional mail, speech-to-text, and any LLM usage per [technical-design-v1.md](technical-design-v1.md) and the PRD. | Provider dashboards; domain auth for mail per [email-deliverability.md](email-deliverability.md) when email is in scope. |

## 3. Production (Railway + production-only for now)

Use this section once the monorepo includes an API workspace, `npm run db:migrate`, and the workflows you expect in production.

1. **Set required GitHub secrets (production only):**
   - `DATABASE_URL_PRODUCTION` (Railway Postgres connection URL)
   - `ENABLE_AUTO_PROD_MIGRATE` set to `true` to enable automatic migrate on `main` pushes
2. **Manual migration remains available:** [`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) still supports **workflow_dispatch** for controlled production runs via **Actions → Database migrate**.
3. **Automatic migration (enabled here):** the same workflow now runs on `push` to `main` for migration-related files and applies `npm run db:migrate -w @memories/api` against `DATABASE_URL_PRODUCTION` when `ENABLE_AUTO_PROD_MIGRATE=true`.
4. **Deploy order:** If Railway deploys application code from the same push, keep branch protections strict so automatic migrations run only from validated `main` commits.
5. **Local dev (standard):** Run `npm run db:prepare` from repo root on Windows. This runs `scripts/setup-dev-db.ps1` to provision/start a local PostgreSQL cluster, enforce `scram-sha-256` + localhost-only access, preserve existing passworded `DATABASE_URL` values in `.env`, and then apply `npm run db:migrate -w @memories/api`.
6. **Health checks:** Configure the host’s **Healthcheck Path** to match the unauthenticated health route in [technical-design-v1.md](technical-design-v1.md) (commonly **`/health`**). A wrong path causes failed deploys or routing to unhealthy replicas.

## 4. Immediate "do now" checklist (production-only mode)

Complete these before the first production-bound schema cut:

1. **Provision database:** create the **production** Railway PostgreSQL instance for Memories.
2. **Set repository secrets:** in GitHub repository settings, add:
   - `DATABASE_URL_PRODUCTION`
   - `ENABLE_AUTO_PROD_MIGRATE=true` (only when ready for auto mode)
3. **Run a controlled first migration (manual):** run **Actions → Database migrate** with:
   - `api_workspace=@memories/api`
4. **Record migration ownership:** note accountable owners for:
   - initiating production migration runs
   - validating post-migrate app health
   - rollback/restore decisions
5. **Capture evidence in implementation log:** append date + operator + workflow run URL + outcome in [implementation-log.md](implementation-log.md).

## 5. Production DB migration readiness runbook

Use this checklist each time a migration is considered for production.

### 5.1 Prerequisites

- **CI green** on the target commit (`docs-smoke`, `checks`, security jobs in use).
- **Schema is additive-first** for rollout safety (no destructive drops in the same release unless explicitly approved).
- **Backup/restore path confirmed** with platform operator before production run.
- **Secrets verified** and reachable from GitHub Actions (`DATABASE_URL_PRODUCTION`).

### 5.2 Production execution

1. Trigger **Database migrate** manually for the first production run, then rely on auto mode for subsequent main merges.
2. Use a designated operator and a second reviewer/witness for visibility.
3. Monitor:
   - workflow step output
   - app health checks
   - error-rate/latency dashboards
4. Record workflow URL and outcome in [implementation-log.md](implementation-log.md).

### 5.3 Rollback policy (default)

- Prefer **forward fixes** via a new additive migration.
- If rollback is required, use platform **backup restore** under owner approval.
- Document incident, decision owner, and follow-up actions in [implementation-log.md](implementation-log.md).

### 5.4 What to wait on

Keep these deferred until production migration cadence is stable:

- Staging database re-introduction and pre-prod gates (add back when staging exists).
- Destructive/contract-tightening schema changes in the same release as feature rollout.

## 6. Related documentation

- Stack summary: [tech-stack.md](tech-stack.md)
- Architecture and vendors (PHI, BAA, etc.): [technical-design-v1.md](technical-design-v1.md)
- Activity log: [implementation-log.md](implementation-log.md)

## 7. Revision history

| Date | Notes |
| --- | --- |
| 2026-04-30 | Tuned for Railway production-only mode: documented `ENABLE_AUTO_PROD_MIGRATE`, manual-first then automatic `main` migrations, and removed temporary staging dependency from checklist. |
| 2026-04-30 | Added explicit do-now checklist + production DB migration readiness runbook (staging gate, ownership, rollback, and evidence logging). |
| 2026-04-30 | Aligned with Ohana `cursor-template` CI/migrate docs; Memories-specific providers and `@memories/api` defaults. |
