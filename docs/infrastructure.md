# MyLists infrastructure

## 1. Document control


| Field            | Value                                                                                     |
| ---------------- | ----------------------------------------------------------------------------------------- |
| **Purpose**      | Where production-related services live and how operators sign in (no credentials in git). |
| **Owner**        | Eng/Ops                                                                                   |
| **Last updated** | 2026-04-18                                                                                |


This document is a **vendor map** only. **Do not** store API keys, database URLs, Resend keys, session secrets, or recovery codes here — use a password manager, **Railway** service variables, and **GitHub Actions** repository secrets.

## 2. Providers and roles


| Provider    | Role                                                                                                                                                 | Access                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **GitHub**  | Source repository for this monorepo; **Actions** (CI, manual **Database migrations** workflow per [development-plan.md](development-plan.md) §14.2). | GitHub account with repo access.                                             |
| **Railway** | Hosts `**lists-api`** and `**lists-web**`; managed **PostgreSQL**; connects to GitHub for deploys.                                                   | **GitHub** login to Railway (as linked for your project).                    |
| **GoDaddy** | **DNS** for public domain(s) (e.g. records pointing to Railway).                                                                                     | GoDaddy registrar/DNS account.                                               |
| **Resend**  | Transactional **email** (magic links, password reset, **list-invite** outbox sends when `EMAIL_PROVIDER` is set); domain auth per [email-deliverability.md](email-deliverability.md). | **GitHub** login to Resend (or whatever sign-in you configured for the org). |


## 3. Production

1. **Automatic migrations:** On every push to `main`, after the `ci` job passes, GitHub Actions runs `npm run db:migrate -w @lists/api` against **`DATABASE_URL_PRODUCTION`** (repository secret). Configure that secret to match the Railway production Postgres URL.
2. **Manual migrations:** Use the **Database migrations** workflow (`migrate.yml`) with `workflow_dispatch` when you need staging/production without a `main` push, or to target staging via `DATABASE_URL_STAGING`.
3. **Deploy order:** If the app host (e.g. Railway) deploys on the same push as CI, ensure new instances do not serve code that requires a schema the DB does not have yet—for example require the `migrate-production` job to succeed before deploy, or run the manual migration workflow before merging risky changes.
4. **Local dev:** After pulling migration files, run `npm run db:migrate -w @lists/api` with `DATABASE_URL` in the repo-root `.env`.

Railway may re-deploy when you push to Git; Dockerfiles are not required for that flow alone.

## 4. Related documentation

- Execution snapshot and env reminders: [status.md](status.md)
- Railway, DNS, TLS, migrations checklist: [development-plan.md](development-plan.md) §14.2 prompt **14** (operator TODO)
- Stack-level hosting summary: [tech-stack.md](tech-stack.md) (Data & infrastructure)

## 5. Revision history


| Date       | Notes                                                    |
| ---------- | -------------------------------------------------------- |
| 2026-04-17 | Initial provider map (GitHub, Railway, GoDaddy, Resend). |
| 2026-04-18 | Document automatic production migrations on `main` (CI) and dev `db:migrate`. |


