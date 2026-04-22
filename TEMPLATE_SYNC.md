# Template Sync Guide

This repo is the canonical starter pack for reusable project scaffolding.

## Source of truth

- Treat `cursor-template` as the canonical source for reusable setup.
- If you improve templates in a project repo first, copy those changes back here immediately.

## What to copy into new projects

- `.cursor/rules/`
- `.cursor/skills/`
- `AGENTS.md`
- `docs/templates/`
- `NEW_PROJECT_CHECKLIST.md`
- `CONTRIBUTING.md`
- `LICENSE`, `SECURITY.md`, `CODE_OF_CONDUCT.md`
- `.github/` starter templates/workflows (including `security.yml`)
- root setup files (`.editorconfig`, `.gitattributes`, `.gitignore`, `.nvmrc`)
- formatting defaults (`.prettierrc.json`, `.prettierignore`)
- team ownership file (`.github/CODEOWNERS`)
- setup scaffolding (`.env.example`, `scripts/bootstrap.*`, `scripts/new-project-init.*`, `scripts/verify-template.*`)

## What not to copy by default

- Versioned release docs (`*-v1.*.md`, release notes, status logs)
- Product-specific infrastructure details unless intentionally reused
- App-specific migrations, seeded data, or secrets

## Update workflow

1. Make template changes in `cursor-template`.
2. Run quick sanity checks for markdown and workflow syntax.
3. When starting a new project, copy from this repo first.
4. If project-specific improvements are made elsewhere, backport them here in the same session.

