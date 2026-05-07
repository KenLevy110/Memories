# Memories infrastructure

## 1. Document control

| Field | Value |
| --- | --- |
| **Purpose** | Where production-related services live and how operators sign in (no credentials in git). |
| **Owner** | Eng/Ops |
| **Last updated** | 2026-05-07 |

This document is a **vendor map** only. **Do not** store API keys, database URLs, provider keys, session secrets, or recovery codes here — use **Google Secret Manager**, your password manager, and **GitHub Actions** repository secrets.

**Starter template (`cursor-template`) vs deployed app:** The repository’s default [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs **documentation smoke checks** and **optional root `npm` scripts** only. It **does not** run **`db:migrate`** or connect to PostgreSQL. [`.github/workflows/migrate.yml`](../.github/workflows/migrate.yml) provides **manual** migrations (`workflow_dispatch`) and an opt-in automatic migrate on `main` once a monorepo and secrets exist. The deployment workflows ([`deploy-api.yml`](../.github/workflows/deploy-api.yml), [`deploy-web.yml`](../.github/workflows/deploy-web.yml)) build and ship the API container and web bundle to Google Cloud.

## 2. Providers and roles

| Provider | Role | Access |
| --- | --- | --- |
| **GitHub** | Source repository; **Actions** — [`ci.yml`](../.github/workflows/ci.yml) (docs + optional Node); [`migrate.yml`](../.github/workflows/migrate.yml) (manual + opt-in automatic DB migrate); [`deploy-api.yml`](../.github/workflows/deploy-api.yml) (Cloud Run); [`deploy-web.yml`](../.github/workflows/deploy-web.yml) (Firebase Hosting); **Security** workflow. | GitHub account with repo access. |
| **Google Cloud Platform** | **App host** for `apps/api` (**Cloud Run**, region `us-west1`), **PostgreSQL** (**Cloud SQL** for Postgres 16, `db-f1-micro`), **object storage** (**Cloud Storage**, private bucket per env), **secrets** (**Secret Manager**), and **container registry** (**Artifact Registry**). API HTTP health check matches `GET /health` per [technical-design-v1.md](technical-design-v1.md). | Google account with project IAM (Owner during bootstrap; least-privilege thereafter). |
| **Firebase Hosting** | Static hosting for `apps/web` (Vite bundle), backed by global CDN with branch preview channels for PRs. Same project id as the GCP project above. | Firebase Console (linked to the GCP project). |
| **DNS / TLS** | Public hostname(s) and certificates for API and web as you define them; Cloud Run domain mapping or a Google Cloud HTTPS Load Balancer for the API; Firebase custom domain for the web app. | Registrar or DNS provider account. |
| **Email / STT / LLM** | Chosen vendors for transactional mail, speech-to-text, and any LLM usage per [technical-design-v1.md](technical-design-v1.md) and the PRD. | Provider dashboards; domain auth for mail per [email-deliverability.md](email-deliverability.md) when email is in scope. |

## 3. Production (Google Cloud, single region: `us-west1`)

The production deployment is provisioned with the idempotent script at [`infra/gcp/bootstrap.sh`](../infra/gcp/bootstrap.sh) and the [Operator README](../infra/gcp/README.md). Layout:

- `apps/api` -> **Cloud Run service** `memories-api`, container from [`apps/api/Dockerfile`](../apps/api/Dockerfile), runtime SA `memories-api-run`, Cloud SQL attached via `--add-cloudsql-instances`, secrets bound from Secret Manager.
- `apps/web` -> **Firebase Hosting** (Vite `dist/`), config in [`apps/web/firebase.json`](../apps/web/firebase.json).
- Postgres -> **Cloud SQL for Postgres 16**, `db-f1-micro`, single zone, daily backups + 7-day PITR. Connected via the Cloud SQL Auth Proxy (Cloud Run) or the public IP form (GitHub Actions migrations).
- Object storage -> **Cloud Storage** bucket (`memories-prod-media`), uniform bucket-level access, public-access prevention on, CORS from [`infra/gcp/cors.json`](../infra/gcp/cors.json). Storage key contract `{practiceId}/uploads/{images|audio}/{mediaId}` (matches `apps/api/src/app.ts`).
- Secrets -> **Secret Manager** entries `DATABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_JWKS_URI`. Cloud Run binds them at deploy time via `--set-secrets`.
- Auth for CI/CD -> **Workload Identity Federation** pool/provider scoped to this GitHub repo. The deploy SA (`memories-deploy`) is impersonated by Actions; no JSON keys are stored.
- Transcription -> **Cloud Run Job** triggered by **Eventarc** on `object.finalize` for the audio prefix (added in a follow-up phase; SA `memories-transcribe` is provisioned by the bootstrap script and grants are pre-wired).

Required GitHub Actions secrets (the bootstrap script prints these at the end):

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_WIF_PROVIDER`
- `GCP_DEPLOY_SA`
- `GCP_RUNTIME_SA`
- `GCP_ARTIFACT_REPO`
- `GCP_API_SERVICE`
- `GCP_MEDIA_BUCKET`
- `GCP_SQL_INSTANCE_CONNECTION`
- `API_URL` (public Cloud Run URL, used to inject `VITE_API_URL` into the web build)
- `DATABASE_URL_PRODUCTION` (used by [`migrate.yml`](../.github/workflows/migrate.yml); a public-IP or proxy-fronted form so GitHub-hosted runners can reach Cloud SQL)
- `ENABLE_AUTO_PROD_MIGRATE` set to `true` only when ready for automatic migrations on `main`

## 4. Immediate "do now" checklist (production-only mode)

Complete these before the first production-bound schema cut:

1. **Provision GCP:** run [`infra/gcp/bootstrap.sh`](../infra/gcp/bootstrap.sh) with `PROJECT_ID`, `REGION=us-west1`, and `GITHUB_REPO`. Capture the printed summary.
2. **Populate JWT secrets:** add real values to `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_JWKS_URI` in Secret Manager (`gcloud secrets versions add ... --data-file=-`).
3. **Set repository secrets:** add the values printed by the bootstrap script to GitHub **Settings -> Secrets and variables -> Actions**, plus `DATABASE_URL_PRODUCTION` for migrations and `API_URL` for web builds.
4. **Run a controlled first migration (manual):** **Actions -> Database migrate** with `api_workspace=@memories/api`.
5. **Deploy:** trigger **Deploy API (Cloud Run)** then **Deploy Web (Firebase Hosting)** (or push to `main`).
6. **Capture evidence in implementation log:** append date + operator + workflow run URL + outcome in [implementation-log.md](implementation-log.md).

## 5. Production DB migration readiness runbook

Use this checklist each time a migration is considered for production.

### 5.1 Prerequisites

- **CI green** on the target commit (`docs-smoke`, `checks`, security jobs in use).
- **Schema is additive-first** for rollout safety (no destructive drops in the same release unless explicitly approved).
- **Backup/restore path confirmed** with platform operator before production run (Cloud SQL backups + PITR window ≥ 7 days).
- **Secrets verified** and reachable from GitHub Actions (`DATABASE_URL_PRODUCTION`).

### 5.2 Production execution

1. Trigger **Database migrate** manually for the first production run, then rely on auto mode for subsequent main merges.
2. Use a designated operator and a second reviewer/witness for visibility.
3. Monitor:
   - workflow step output
   - Cloud Run revision health (`/health`) post-migrate
   - Cloud Logging error rates and Cloud SQL CPU / connections
4. Record workflow URL and outcome in [implementation-log.md](implementation-log.md).

### 5.3 Rollback policy (default)

- Prefer **forward fixes** via a new additive migration.
- If rollback is required, use **Cloud SQL backup restore** (or PITR) under owner approval.
- Document incident, decision owner, and follow-up actions in [implementation-log.md](implementation-log.md).

### 5.4 What to wait on

Keep these deferred until production migration cadence is stable:

- Staging Cloud SQL re-introduction and pre-prod gates (use `ENV_NAME=staging` against the same bootstrap script when ready).
- Destructive/contract-tightening schema changes in the same release as feature rollout.
- Cloud SQL HA + read replica (move to `db-g1-small` or larger first).

## 6. Related documentation

- Stack summary: [tech-stack.md](tech-stack.md)
- Architecture and vendors: [technical-design-v1.md](technical-design-v1.md)
- Operator runbook: [`infra/gcp/README.md`](../infra/gcp/README.md)
- Activity log: [implementation-log.md](implementation-log.md)

## 7. Revision history

| Date | Notes |
| --- | --- |
| 2026-05-07 | Switched production target from Railway to Google Cloud (Cloud Run + Cloud SQL `db-f1-micro` + Cloud Storage + Firebase Hosting), single region `us-west1`. Added [`infra/gcp/`](../infra/gcp/) bootstrap + cors + README, [`apps/api/Dockerfile`](../apps/api/Dockerfile), [`apps/web/firebase.json`](../apps/web/firebase.json), and the `deploy-api.yml` / `deploy-web.yml` workflows wired through Workload Identity Federation. |
| 2026-04-30 | Tuned for Railway production-only mode: documented `ENABLE_AUTO_PROD_MIGRATE`, manual-first then automatic `main` migrations, and removed temporary staging dependency from checklist. |
| 2026-04-30 | Added explicit do-now checklist + production DB migration readiness runbook (staging gate, ownership, rollback, and evidence logging). |
| 2026-04-30 | Aligned with Ohana `cursor-template` CI/migrate docs; Memories-specific providers and `@memories/api` defaults. |
