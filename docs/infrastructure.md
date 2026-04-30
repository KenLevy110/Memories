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

## 3. Production (when the API has migrations)

Use this section once the monorepo includes an API workspace, `npm run db:migrate`, and the workflows you expect in production.

1. **Manual migrations (included):** [`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) runs **`npm run db:migrate`** via **Actions → Database migrate** (pick **staging** or **production**). Add repository secrets **`DATABASE_URL_PRODUCTION`** and, if needed, **`DATABASE_URL_STAGING`**. The default **`api_workspace`** input is **`@memories/api`**; change it if your API package name differs.
2. **Automatic migrations (optional):** You may add a **`push: branches: [main]`** job to `migrate.yml` (or CI) that runs the same migrate command against **`DATABASE_URL_PRODUCTION`** after tests pass. The template leaves this **off** by default so merges do not silently change production schema.
3. **Deploy order:** If the app host deploys on the same push as CI, ensure new instances do not serve code that requires a schema the database does not have yet — for example run **Database migrate** before or as a gate before traffic, or add an automatic migrate job you trust.
4. **Local dev (standard):** Run `npm run db:prepare` from repo root on Windows. This runs `scripts/setup-dev-db.ps1` to provision/start a local PostgreSQL cluster and write `DATABASE_URL`/`TEST_DATABASE_URL` in `.env`, then applies `npm run db:migrate -w @memories/api`.
5. **Health checks:** Configure the host’s **Healthcheck Path** to match the unauthenticated health route in [technical-design-v1.md](technical-design-v1.md) (commonly **`/health`**). A wrong path causes failed deploys or routing to unhealthy replicas.

## 4. Related documentation

- Stack summary: [tech-stack.md](tech-stack.md)
- Architecture and vendors (PHI, BAA, etc.): [technical-design-v1.md](technical-design-v1.md)
- Activity log: [implementation-log.md](implementation-log.md)

## 5. Revision history

| Date | Notes |
| --- | --- |
| 2026-04-30 | Aligned with Ohana `cursor-template` CI/migrate docs; Memories-specific providers and `@memories/api` defaults. |
