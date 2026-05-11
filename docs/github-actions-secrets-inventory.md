# GitHub Actions secrets and variables inventory

## Document control

| Field | Value |
| --- | --- |
| **Purpose** | Operator checklist: **names only** for repository secrets and variables used by deployment workflows. No values, keys, or connection strings belong in this file. |
| **Owner** | Eng/Ops |
| **Source of truth** | The workflows under [`.github/workflows/`](../.github/workflows/) (each file’s header comment plus `secrets.*` / `vars.*` references). When workflows change, update this doc in the same PR. |

## Two different “secret” systems

| System | What it holds | Where you manage it |
| --- | --- | --- |
| **GitHub Actions** | Values CI needs to authenticate to GCP, build the web app with `VITE_*`, and run migrations from GitHub-hosted runners | GitHub → **Settings → Secrets and variables → Actions** |
| **Google Cloud Secret Manager** | Runtime secrets for **Cloud Run** (`DATABASE_URL`, `JWT_*`) | GCP Console → Secret Manager (see [infrastructure.md](infrastructure.md) section 3) |

GitHub does **not** automatically receive Secret Manager values. Keep both checklists in mind when provisioning a new environment.

---

## Repository secrets (GitHub Actions)

Set each name exactly as below. Never commit values to git.

| Secret name | Role | Where to obtain | Used by |
| --- | --- | --- | --- |
| `GCP_PROJECT_ID` | GCP (and Firebase) project id | GCP Console (project picker) or [`infra/gcp/bootstrap.sh`](../infra/gcp/bootstrap.sh) summary | [deploy-api.yml](../.github/workflows/deploy-api.yml), [deploy-web.yml](../.github/workflows/deploy-web.yml) |
| `GCP_REGION` | Region (e.g. `us-west1`) | Chosen when provisioning; bootstrap summary | deploy-api |
| `GCP_WIF_PROVIDER` | Workload Identity Federation provider resource name | IAM → Workforce identity / WIF; bootstrap prints full resource name | deploy-api, deploy-web |
| `GCP_DEPLOY_SA` | Deploy service account email (`memories-deploy@…`) | Created by bootstrap; shows in GCP → IAM | deploy-api, deploy-web |
| `GCP_RUNTIME_SA` | Cloud Run runtime service account email (`memories-api-run@…`) | Created by bootstrap | deploy-api |
| `GCP_ARTIFACT_REPO` | Artifact Registry repository id | Artifact Registry console or bootstrap | deploy-api |
| `GCP_API_SERVICE` | Cloud Run service name | Bootstrap / first `gcloud run deploy` name (e.g. `memories-api`) | deploy-api |
| `GCP_MEDIA_BUCKET` | GCS bucket name for media | GCS console or bootstrap (e.g. `memories-prod-media`) | deploy-api |
| `GCP_SQL_INSTANCE_CONNECTION` | Cloud SQL instance connection string (`project:region:instance`) | Cloud SQL → instance overview | deploy-api |
| `API_URL` | Public base URL of the API (injected as `VITE_API_URL` in the web build; no trailing slash) | Cloud Run → service **URL**, or `gcloud run services describe … --format='value(status.url)'` | deploy-web |
| `FIREBASE_WEB_API_KEY` | Firebase Web SDK `apiKey` | [Firebase Console](https://console.firebase.google.com/) → Project settings → Your apps → Web app | deploy-web |
| `FIREBASE_WEB_AUTH_DOMAIN` | Firebase Web SDK `authDomain` | Same Web app config object | deploy-web |
| `FIREBASE_WEB_PROJECT_ID` | Firebase Web SDK `projectId` | Same (matches GCP project id when Hosting is in the same project) | deploy-web |
| `FIREBASE_WEB_STORAGE_BUCKET` | Firebase Web SDK `storageBucket` | Same | deploy-web |
| `FIREBASE_WEB_MESSAGING_SENDER_ID` | Firebase Web SDK `messagingSenderId` | Same | deploy-web |
| `FIREBASE_WEB_APP_ID` | Firebase Web SDK `appId` | Same | deploy-web |
| `DATABASE_URL_PRODUCTION` | Postgres URL reachable **from GitHub-hosted runners** (often public IP / proxy form of Cloud SQL) | Build from Cloud SQL connection settings + credentials your ops allow for CI (see [infrastructure.md](infrastructure.md)); not the same URL as private Cloud Run access unless you proxy | [migrate.yml](../.github/workflows/migrate.yml) |
| `ENABLE_AUTO_PROD_MIGRATE` | Set to the literal string `true` only when automatic production migrations on `main` are desired; any other value disables auto migrate | You enter **`true`** in GitHub when you intentionally enable auto migrate (no external vendor) | migrate |

---

## Repository variables (GitHub Actions)

Variables are non-secret configuration toggles (still do not commit policy you care about to git if it is sensitive).

| Variable name | Role | Where to obtain | Used by |
| --- | --- | --- | --- |
| `MEMORIES_MIGRATE_TLS_INSECURE` | Optional. Set to `false` to require strict TLS certificate verification for `drizzle-kit migrate` from Actions. If unset or not `false`, migrate uses relaxed TLS verification for typical Cloud SQL public-IP setups (see [infrastructure.md](infrastructure.md)) | Set in GitHub → **Actions** → **Variables** when you want strict TLS; omit or leave non-`false` for default migrate behavior | migrate |

---

## Google Cloud Secret Manager (API runtime, not GitHub)

These values are **encrypted key–value blobs** stored in GCP; Cloud Run mounts them as environment variables on the API service via `--set-secrets` in [deploy-api.yml](../.github/workflows/deploy-api.yml). Create each secret **once** (use the names in the table below), then add **new versions** when values rotate. Store payloads **only** in GCP Secret Manager, not in GitHub (unless you deliberately duplicate elsewhere).

**How to set them**

- **Console:** Open [Secret Manager](https://console.cloud.google.com/security/secret-manager) for your project → **Create secret** (or select an existing secret → **New version**). Step-by-step: [Create and access secrets](https://cloud.google.com/secret-manager/docs/creating-and-accessing-secrets).
- **CLI:** After [installing gcloud](https://cloud.google.com/sdk/docs/install) and selecting the project, add a version (secret must exist, or create it first with `gcloud secrets create`):  
  `echo -n 'YOUR_VALUE' | gcloud secrets versions add SECRET_NAME --data-file=-`  
  Reference: [`gcloud secrets versions add`](https://cloud.google.com/sdk/gcloud/reference/secrets/versions/add).
- **Bootstrap:** [`infra/gcp/README.md`](../infra/gcp/README.md) describes provisioning; the script creates secret **names**—you still load real values (JWT triple, `DATABASE_URL`) via Console or `gcloud`, per [infrastructure.md](infrastructure.md) section 4, step 2.

| Secret name | Role | Where to obtain |
| --- | --- | --- |
| `DATABASE_URL` | Postgres for the running API (Cloud SQL via connector / private path as you configure) | Cloud SQL connection string for the API runtime (unix socket or private IP form via Cloud Run connector); see [infrastructure.md](infrastructure.md) |
| `JWT_ISSUER` | JWT verification (e.g. Firebase issuer) | For Firebase ID tokens: `https://securetoken.google.com/<firebase_project_id>` per [infrastructure.md](infrastructure.md) section 3.1 |
| `JWT_AUDIENCE` | JWT audience (must match tokens the web app sends) | For Firebase: `<firebase_project_id>` (same as GCP/Firebase project id) |
| `JWT_JWKS_URI` | JWKS URL for verifying signing keys | For Firebase: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com` |

---

## How to remember this on the next project

1. **Treat workflows as canonical.** Copy the header block from each workflow into your new repo, or keep one inventory markdown (this pattern) and update it whenever you add `${{ secrets.NEW_NAME }}`.
2. **One-time audit command** (from repo root, with [ripgrep](https://github.com/BurntSushi/ripgrep) installed):  
   `rg 'secrets\.\w+|vars\.\w+' .github/workflows`  
   That lists every reference so you can reconcile names against GitHub’s UI.
3. **Bootstrap scripts.** If you maintain an `infra/*/bootstrap.sh`, print a **checklist table** at the end (names only) so operators paste into GitHub in one sitting.
4. **GitHub CLI.** After values exist in a local password manager or `.env` file on a secure machine, `gh secret set NAME -b"value"` avoids manual web form entry; see comments in [infrastructure.md](infrastructure.md) and team runbooks.
5. **IaC (optional).** Terraform or Pulumi can declare GitHub repository secrets from a private state backend; use when you outgrow a single markdown inventory.

For Legacy’s full provider map and operator checklist, see [infrastructure.md](infrastructure.md).

Greenfield repos spun from the **`cursor-template`** starter pack should copy **`docs/templates/github-actions-secrets-inventory-template.md`** from that template repo into **`docs/github-actions-secrets-inventory.md`** and replace this Legacy-specific inventory when appropriate.
