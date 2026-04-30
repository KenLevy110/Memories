# MyLists infrastructure

## 1. Document control


| Field            | Value                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Purpose**      | Where production-related services live and how operators sign in (no credentials in git). |
| **Owner**        | Eng/Ops                                                                                   |
| **Last updated** | 2026-04-30                                                                                |


This document is a **vendor map** only. **Do not** store API keys, database URLs, Resend keys, session secrets, or recovery codes here — use a password manager, **Railway** service variables, and **GitHub Actions** repository secrets.

**Starter template (`cursor-template`) vs deployed app:** The repository’s default [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **documentation smoke checks** and **optional root `npm` scripts** only. It **does not** run **`db:migrate`** or connect to PostgreSQL. [`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) provides **manual** migrations (`workflow_dispatch`) once a monorepo and secrets exist. Section 3 below describes **optional** automation (e.g. migrate on push to `main`) in addition to that workflow.

## 2. Providers and roles


| Provider    | Role                                                                                                                                                 | Access                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **GitHub**  | Source repository; **Actions** — starter [**`ci.yml`**](../.github/workflows/ci.yml) (docs + optional Node); [**`migrate.yml`**](../.github/workflows/migrate.yml) (**manual** DB migrate when monorepo exists); **Security** workflow. | GitHub account with repo access.                                             |
| **Railway** | Hosts `**lists-api`** and `**lists-web**`; managed **PostgreSQL**; API service **HTTP health check** should target the path in [technical-design.md](technical-design.md) §6.1 (commonly **`/health`**). | **GitHub** login to Railway (as linked for your project).                    |
| **GoDaddy** | **DNS** for public domain(s) (e.g. records pointing to Railway).                                                                                     | GoDaddy registrar/DNS account.                                               |
| **Resend**  | Transactional **email** (magic links, password reset, **list-invite** outbox sends when `EMAIL_PROVIDER` is set); domain auth per [email-deliverability.md](email-deliverability.md). | **GitHub** login to Resend (or whatever sign-in you configured for the org). |


## 3. Production (full application repo)

Use this section once the monorepo includes an API workspace, `db:migrate`, and the workflows you expect in production.

1. **Manual migrations (included):** [`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) runs **`npm run db:migrate`** via **Actions → Database migrate** (pick **staging** or **production**). Add repository secrets **`DATABASE_URL_PRODUCTION`** and, if needed, **`DATABASE_URL_STAGING`**. Adjust the **`api_workspace`** input if your API package name is not **`@lists/api`**.
2. **Automatic migrations (optional):** You may add a **`push: branches: [main]`** job to `migrate.yml` (or CI) that runs the same migrate command against **`DATABASE_URL_PRODUCTION`** after tests pass. The template leaves this **off** by default so merges do not silently change production schema.
3. **Deploy order:** If the app host (e.g. Railway) deploys on the same push as CI, ensure new instances do not serve code that requires a schema the DB does not have yet—for example run **Database migrate** before or as a gate before traffic, or add an automatic migrate job you trust.
4. **Local dev:** After pulling migration files, run `npm run db:migrate -w @lists/api` with `DATABASE_URL` in the repo-root `.env`.
5. **Health checks (Railway):** Set **`lists-api`** **Healthcheck Path** to match [technical-design.md](technical-design.md) §6.1—typically **`/health`**. A wrong path causes failed deploys or routing to unhealthy replicas.

Railway may re-deploy when you push to Git; Dockerfiles are not required for that flow alone.

## 4. Related documentation

- Execution snapshot and env reminders: [status.md](status.md)
- Railway, DNS, TLS, migrations checklist: [development-plan.md](development-plan.md) §14.2 prompt **14** (operator TODO)
- Stack-level hosting summary: [tech-stack.md](tech-stack.md) (Data & infrastructure)

## 5. Revision history


| Date       | Notes                                                    |
| ---------- | -------------------------------------------------------- |
| 2026-04-17 | Initial provider map (GitHub, Railway, GoDaddy, Resend). |
| 2026-04-30 | Clarified starter **`ci.yml`** does not run DB migrations; §3 is for full app; adjusted GitHub row. |
| 2026-04-30 | Added [**`migrate.yml`**](../.github/workflows/migrate.yml) — **workflow_dispatch** DB migrations; §3 reordered (manual first, optional auto). |
| 2026-04-30 | Railway **health check** guidance: API path (typically **`/health`**) vs TDD §6.1; §3 step 5. |
| 2026-04-18 | Document automatic production migrations on `main` (CI) and dev `db:migrate`. |


