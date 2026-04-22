# New Project Checklist

Use this checklist each time you create a project from `Memories`.

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

- [ ] Configure CI checks for lint, tests, and build
- [ ] Configure security checks in `.github/workflows/security.yml`
- [ ] Require both CI and Security checks in branch protection
- [ ] Add branch/PR conventions
- [ ] Add release and rollback notes appropriate for project risk
- [ ] Update `.github/CODEOWNERS` with real team handles
- [ ] Update `SECURITY.md` and `CODE_OF_CONDUCT.md` reporting contacts
- [ ] Add threat modeling and auth/authz test scenarios for sensitive features
- [ ] Run `scripts/verify-template.ps1` or `scripts/verify-template.sh`

