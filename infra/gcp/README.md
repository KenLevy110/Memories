# GCP infrastructure (Memories)

Operator runbook for the Google Cloud deployment described in [`docs/infrastructure.md`](../../docs/infrastructure.md). This folder is the source of truth for shell-driven provisioning. No secrets are committed.

## What this provisions

- Artifact Registry repository (Docker, regional)
- Cloud SQL for PostgreSQL 16 (`db-f1-micro`, single-zone, daily backups + 7-day PITR)
- Cloud Storage bucket (uniform access, public-access prevention, CORS from [`cors.json`](cors.json))
- Service accounts: `memories-api-run` (Cloud Run runtime), `memories-deploy` (CI/CD), `memories-transcribe` (Cloud Run Job)
- Secret Manager entries: `DATABASE_URL`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_JWKS_URI`
- IAM bindings, including `roles/iam.serviceAccountTokenCreator` on the runtime SA so V4 signed URLs work without a downloaded key file
- Workload Identity Federation pool + provider scoped to the repo so GitHub Actions can deploy without long-lived JSON keys

The script is idempotent: re-running skips resources that already exist.

## Prerequisites

- A GCP billing account and an empty (or designated) project.
- `gcloud` authenticated as project Owner or Editor (Cloud Shell satisfies this).
- The repo cloned locally or in Cloud Shell.

## Run

```bash
PROJECT_ID=memories-prod \
REGION=us-west1 \
GITHUB_REPO=YOUR_GH_OWNER/Memories \
./infra/gcp/bootstrap.sh
```

`ENV_NAME` defaults to `prod`; pass `ENV_NAME=staging` for a parallel non-prod stack.

The script prints the GitHub repository secrets you need to set at the end. Copy them into **Settings -> Secrets and variables -> Actions**.

## Frontend (Firebase Hosting)

The web app deploys to Firebase Hosting. The Firebase project is the **same GCP project** the bootstrap script provisioned.

```bash
# One-time, from the repo root, while logged into Firebase as the project owner:
npx firebase-tools login
npx firebase-tools projects:addfirebase memories-prod
npx firebase-tools target:apply hosting web memories-prod
```

CI deploys are wired through `firebase deploy --only hosting` in [`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml) using the same Workload Identity Federation principal as the API.

## Production smoke checks after first deploy

1. `curl https://<cloud-run-url>/health` returns `{ "status": "ok", "service": "legacy-api" }`.
2. Issue a signed image upload URL through the API and PUT a small file directly to GCS.
3. Read the file back via `POST /api/v1/memory-media/:mediaId/sign-read` once a memory finalize round-trip completes.
4. Check Cloud Logging for `pino` JSON output (no plaintext secrets).
5. Confirm Cloud SQL connections via the connection logs page (TLS + IAM if enabled).

## Tear down (non-prod only)

```bash
gcloud sql instances delete memories-staging --quiet
gcloud storage rm -r gs://memories-staging-media
gcloud run services delete memories-api --region=us-west1 --quiet
```

Secret Manager entries and service accounts can be removed individually after the dependent services are gone.
