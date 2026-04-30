# Contributing

## Definition of done

- Run lint and type checks before requesting review.
- Run relevant tests for changed areas; keep coverage within **`AGENTS.md`** thresholds unless an approved waiver applies.
- Follow **`AGENTS.md` → Engineering quality pillars** (unit/component coverage, secure implementation, layered review per development plan) for non-trivial work.
- Include regression tests for bug fixes.
- Update docs when behavior or architecture changes.
- Keep changes scoped and avoid unrelated refactors.

## Sensitive data notice

Transcripts can include prompts, code snippets, environment details, and operational notes. **Do not paste production secrets, live URLs with tokens, session cookies, or credentials into agent chats**—they can be copied into `.jsonl` archives. Review transcript diffs before commit and redact anything that should not live in git history.

## Pull request expectations

- **Branches and PRs:** Open branches and pull requests yourself (or per your team’s process). Automation and coding agents should not create remote branches or PRs unless the project explicitly allows it.
- **Branch protection:** In GitHub, add **required status checks** for each CI job you rely on—typically **`docs-smoke`** and **`checks`** (workflow **CI**), plus **Security** jobs such as **`secrets-scan`** and **`npm-audit`** (**`dependency-review`** runs on pull requests only). Verify names in **Actions** after the first workflow run.
- Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md` (documentation + agent transcript checklists included).
- Describe risk and rollback notes for non-trivial changes.
- Call out assumptions and follow-up work clearly.

## Git hooks (agent transcripts)

- From the repo root, run: `git config core.hooksPath .githooks`
- **pre-commit** syncs transcripts (bash script preferred; PowerShell fallback) and **stages** **`docs/agent-chats`** when files change.
- **pre-push** runs sync again and **blocks** the push if **`docs/agent-chats/`** is still dirty—amend or commit, or use **`SKIP_AGENT_CHAT_SYNC=1`** only in exceptional cases (note in the PR).
- Set **`CURSOR_AGENT_TRANSCRIPTS_DIR`** or copy **`scripts/sync-agent-chats.local.env.example`** → **`scripts/sync-agent-chats.local.env`** (see **`docs/agent-chats/README.md`**).
- Locally verify doc layout anytime: **`scripts/check-docs.sh`** (Git Bash / Linux / macOS) or **`scripts/check-docs.ps1`** (Windows).

## Security minimum baseline

- Do not commit secrets (`.env`, API keys, tokens, credentials, private keys).
- Validate and sanitize all external input (API, forms, file uploads, webhooks).
- Enforce authorization checks for protected reads/writes, not only authentication.
- Keep sensitive data out of logs; never log passwords, tokens, or raw secrets.
- Prefer secure defaults (`https`, `httpOnly` cookies, least-privilege access, deny-by-default).
- Add or update tests for auth/authz and security-sensitive paths when behavior changes.

## Documentation expectations

- For new or substantially rewritten docs, read the matching file in `docs/templates/` first.
- Keep release-specific docs separate from reusable templates.
- When behavior, architecture, or policy changes, update the canonical files listed in **`AGENTS.md` → Documentation alignment**; CI runs **`scripts/check-docs.sh`** for basic layout/regression.

