#!/usr/bin/env bash
# Idempotent GCP bootstrap for the Memories deployment described in
# docs/infrastructure.md. Provisions:
#   - GCP APIs
#   - Artifact Registry repository for the API image
#   - Cloud SQL for PostgreSQL 16 (db-f1-micro, single zone)
#   - Cloud Storage bucket (uniform access, private, CORS)
#   - Secret Manager entries (DATABASE_URL, JWT_*)
#   - Service accounts for Cloud Run runtime, GitHub Actions deploy, transcription job
#   - IAM bindings for V4 URL signing (serviceAccountTokenCreator on self)
#   - Workload Identity Federation pool/provider so GitHub Actions can deploy without keys
#
# Run from Cloud Shell or any machine with gcloud installed and authenticated as
# a project owner / editor.
#
# Usage:
#   PROJECT_ID=memories-prod \
#   REGION=us-west1 \
#   GITHUB_REPO=OWNER/REPO \
#   ./infra/gcp/bootstrap.sh
#
# The script is safe to re-run; it tolerates "already exists" responses.

set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-west1}"
GITHUB_REPO="${GITHUB_REPO:-}"
ENV_NAME="${ENV_NAME:-prod}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "PROJECT_ID is required (e.g. PROJECT_ID=memories-prod)." >&2
  exit 1
fi
if [[ -z "${GITHUB_REPO}" ]]; then
  echo "GITHUB_REPO is required (e.g. GITHUB_REPO=ohana/memories)." >&2
  exit 1
fi

API_SERVICE="memories-api"
WEB_BUCKET_PREFIX="memories"
MEDIA_BUCKET="${WEB_BUCKET_PREFIX}-${ENV_NAME}-media"
ARTIFACT_REPO="memories"
SQL_INSTANCE="memories-${ENV_NAME}"
SQL_DB="memories"
SQL_USER="memories_app"
RUNTIME_SA="memories-api-run"
DEPLOY_SA="memories-deploy"
JOB_SA="memories-transcribe"
WIF_POOL="github-pool"
WIF_PROVIDER="github-oidc"

echo "Using project=${PROJECT_ID} region=${REGION} env=${ENV_NAME}"
gcloud config set project "${PROJECT_ID}" >/dev/null

echo "Enabling required APIs (idempotent)…"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  vpcaccess.googleapis.com \
  eventarc.googleapis.com \
  pubsub.googleapis.com \
  monitoring.googleapis.com \
  logging.googleapis.com

echo "Creating Artifact Registry repository (Docker)…"
gcloud artifacts repositories describe "${ARTIFACT_REPO}" \
  --location="${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${ARTIFACT_REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="Memories container images"

echo "Creating Cloud SQL Postgres instance (db-f1-micro, ENTERPRISE edition, single zone)…"
# --edition=ENTERPRISE is required because new Postgres instances default to
# ENTERPRISE_PLUS, which rejects db-f1-micro and forces db-perf-optimized-N-*
# tiers (much more expensive). Stay on ENTERPRISE for the MVP-cost shape.
gcloud sql instances describe "${SQL_INSTANCE}" >/dev/null 2>&1 || \
  gcloud sql instances create "${SQL_INSTANCE}" \
    --database-version=POSTGRES_16 \
    --edition=ENTERPRISE \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --availability-type=ZONAL \
    --storage-type=SSD \
    --storage-size=10GB \
    --backup-start-time=07:00 \
    --enable-point-in-time-recovery \
    --retained-backups-count=7

gcloud sql databases describe "${SQL_DB}" --instance="${SQL_INSTANCE}" >/dev/null 2>&1 || \
  gcloud sql databases create "${SQL_DB}" --instance="${SQL_INSTANCE}"

if ! gcloud sql users list --instance="${SQL_INSTANCE}" --format="value(name)" | grep -qx "${SQL_USER}"; then
  echo "Creating Cloud SQL user ${SQL_USER} (password printed once; store in Secret Manager below)…"
  SQL_PASSWORD="$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)"
  gcloud sql users create "${SQL_USER}" \
    --instance="${SQL_INSTANCE}" \
    --password="${SQL_PASSWORD}"
  echo "  Cloud SQL password generated. Store the resulting DATABASE_URL secret carefully."
else
  SQL_PASSWORD=""
  echo "Cloud SQL user ${SQL_USER} already exists. Re-use the existing password from Secret Manager."
fi

INSTANCE_CONNECTION_NAME="$(gcloud sql instances describe "${SQL_INSTANCE}" --format='value(connectionName)')"
DATABASE_URL_VALUE="postgres://${SQL_USER}:${SQL_PASSWORD}@/${SQL_DB}?host=/cloudsql/${INSTANCE_CONNECTION_NAME}"

echo "Creating Cloud Storage bucket ${MEDIA_BUCKET} (uniform access, private)…"
if ! gcloud storage buckets describe "gs://${MEDIA_BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${MEDIA_BUCKET}" \
    --location="${REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

echo "Applying bucket CORS from infra/gcp/cors.json…"
gcloud storage buckets update "gs://${MEDIA_BUCKET}" \
  --cors-file="$(dirname "$0")/cors.json"

echo "Creating service accounts…"
for sa in "${RUNTIME_SA}" "${DEPLOY_SA}" "${JOB_SA}"; do
  gcloud iam service-accounts describe "${sa}@${PROJECT_ID}.iam.gserviceaccount.com" >/dev/null 2>&1 || \
    gcloud iam service-accounts create "${sa}" \
      --display-name="${sa}"
done

RUNTIME_SA_EMAIL="${RUNTIME_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA_EMAIL="${DEPLOY_SA}@${PROJECT_ID}.iam.gserviceaccount.com"
JOB_SA_EMAIL="${JOB_SA}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Granting runtime SA permissions (Cloud SQL client, GCS object admin on bucket, Secret Manager accessor, sign blob on self)…"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/cloudsql.client" --condition=None >/dev/null

gcloud storage buckets add-iam-policy-binding "gs://${MEDIA_BUCKET}" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/storage.objectAdmin" >/dev/null

gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA_EMAIL}" \
  --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
  --role="roles/iam.serviceAccountTokenCreator" >/dev/null

echo "Granting deploy SA permissions (Cloud Run admin, Artifact Registry writer, act as runtime SA)…"
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/run.admin" --condition=None >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/artifactregistry.writer" --condition=None >/dev/null
gcloud iam service-accounts add-iam-policy-binding "${RUNTIME_SA_EMAIL}" \
  --member="serviceAccount:${DEPLOY_SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser" >/dev/null

echo "Granting transcription job SA permissions (GCS read, Cloud SQL client, Secret accessor)…"
gcloud storage buckets add-iam-policy-binding "gs://${MEDIA_BUCKET}" \
  --member="serviceAccount:${JOB_SA_EMAIL}" \
  --role="roles/storage.objectViewer" >/dev/null
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${JOB_SA_EMAIL}" \
  --role="roles/cloudsql.client" --condition=None >/dev/null

echo "Storing initial secrets (skipped if already present)…"
ensure_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "${name}" >/dev/null 2>&1; then
    if [[ -z "${value}" ]]; then
      echo "  ${name}: create with placeholder; populate manually:"
      printf "    echo -n 'value' | gcloud secrets create %s --data-file=-\n" "${name}"
      gcloud secrets create "${name}" --replication-policy=automatic --quiet >/dev/null
    else
      echo "  ${name}: creating from generated value"
      printf "%s" "${value}" | gcloud secrets create "${name}" --data-file=- --replication-policy=automatic >/dev/null
    fi
  else
    echo "  ${name}: already exists (leaving untouched)"
  fi
  gcloud secrets add-iam-policy-binding "${name}" \
    --member="serviceAccount:${RUNTIME_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
  gcloud secrets add-iam-policy-binding "${name}" \
    --member="serviceAccount:${JOB_SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null || true
}

ensure_secret "DATABASE_URL" "${DATABASE_URL_VALUE}"
ensure_secret "JWT_ISSUER" ""
ensure_secret "JWT_AUDIENCE" ""
ensure_secret "JWT_JWKS_URI" ""

echo "Setting up Workload Identity Federation for GitHub Actions repo ${GITHUB_REPO}…"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"

gcloud iam workload-identity-pools describe "${WIF_POOL}" --location=global >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools create "${WIF_POOL}" \
    --location=global \
    --display-name="GitHub Actions"

gcloud iam workload-identity-pools providers describe "${WIF_PROVIDER}" \
  --location=global --workload-identity-pool="${WIF_POOL}" >/dev/null 2>&1 || \
  gcloud iam workload-identity-pools providers create-oidc "${WIF_PROVIDER}" \
    --location=global \
    --workload-identity-pool="${WIF_POOL}" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="attribute.repository=='${GITHUB_REPO}'"

WIF_PRINCIPAL="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/attribute.repository/${GITHUB_REPO}"
gcloud iam service-accounts add-iam-policy-binding "${DEPLOY_SA_EMAIL}" \
  --member="${WIF_PRINCIPAL}" \
  --role="roles/iam.workloadIdentityUser" >/dev/null

cat <<SUMMARY

Bootstrap complete. Configure these GitHub Actions repository secrets/variables:

  GCP_PROJECT_ID:                ${PROJECT_ID}
  GCP_REGION:                    ${REGION}
  GCP_RUNTIME_SA:                ${RUNTIME_SA_EMAIL}
  GCP_DEPLOY_SA:                 ${DEPLOY_SA_EMAIL}
  GCP_WIF_PROVIDER:              projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}/providers/${WIF_PROVIDER}
  GCP_ARTIFACT_REPO:             ${ARTIFACT_REPO}
  GCP_API_SERVICE:               ${API_SERVICE}
  GCP_MEDIA_BUCKET:              ${MEDIA_BUCKET}
  GCP_SQL_INSTANCE_CONNECTION:   ${INSTANCE_CONNECTION_NAME}

Database migration secret (already managed by .github/workflows/migrate.yml):

  DATABASE_URL_PRODUCTION:       use the public connection URL with the Cloud SQL
                                 Auth Proxy or a connector for GitHub-hosted runs.

Next steps:
  1. Populate JWT_ISSUER / JWT_AUDIENCE / JWT_JWKS_URI secrets with your IdP values:
       echo -n '<value>' | gcloud secrets versions add JWT_ISSUER --data-file=-
  2. Push to main and trigger the deploy-api / deploy-web workflows.
  3. Configure Firebase Hosting (apps/web) per infra/gcp/README.md.
SUMMARY
