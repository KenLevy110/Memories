# New Project Checklist

Use this checklist when bootstrapping a new repo from Ohana `cursor-template`, or when validating this repo stays aligned with it.

## 1) Initialize project identity

- [ ] Rename project in `README.md`
- [ ] Define project goals and scope
- [ ] Replace placeholder domain language in docs and rules
- [ ] Run `scripts/new-project-init.ps1 <project-name>` or `scripts/new-project-init.sh <project-name>`

## 2) Configure Cursor guidance

- [ ] Review `.cursor/rules` and remove non-applicable rules
- [ ] Review `.cursor/skills` and keep only relevant skills
- [ ] Update `AGENTS.md` for your stack, monorepo layout, and team constraints (adjust the Monorepo structure section if your tree differs)

## 3) Setup local environment

- [ ] Create `.env.example` for the new project
- [ ] Install dependencies
- [ ] Verify scripts (`lint`, `test`, `build`) are present

## 4) Validate quality baseline

- [ ] Run linting
- [ ] Run unit tests
- [ ] Run end-to-end tests (if applicable)
- [ ] Create a feature or release-specific test plan from `docs/templates/test-strategy-template.md`
- [ ] Fix any setup regressions before feature work starts

## 5) Prepare delivery workflow

- [ ] Run `git config core.hooksPath .githooks` and set `CURSOR_AGENT_TRANSCRIPTS_DIR` if needed (`docs/agent-chats/README.md`)
- [ ] Configure CI checks for lint, tests, and build
- [ ] Configure security checks in `.github/workflows/security.yml`
- [ ] Require status checks: **`docs-smoke`**, **`checks`** (CI), and Security jobs you use (**`secrets-scan`**, **`npm-audit`**, PR-only **`dependency-review`**)
- [ ] When PostgreSQL exists: add **`DATABASE_URL_PRODUCTION`** (and **`DATABASE_URL_STAGING`** if used), run **Actions → Database migrate** (`.github/workflows/migrate.yml`), then decide whether to enable automatic migrate on `main` per [`docs/infrastructure.md`](docs/infrastructure.md) (Section 3, production migrations)
- [ ] Add branch/PR conventions
- [ ] Add release and rollback notes appropriate for project risk
- [ ] Update `.github/CODEOWNERS` with real team handles
- [ ] Update `SECURITY.md` and `CODE_OF_CONDUCT.md` reporting contacts
- [ ] Add threat modeling and auth/authz test scenarios for sensitive features
- [ ] Run `scripts/verify-template.ps1` or `scripts/verify-template.sh`

