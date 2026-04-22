# Contributing

## Definition of done

- Run lint and type checks before requesting review.
- Run relevant tests for changed areas.
- Include regression tests for bug fixes.
- Update docs when behavior or architecture changes.
- Keep changes scoped and avoid unrelated refactors.

## Pull request expectations

- Use the PR template in `.github/PULL_REQUEST_TEMPLATE.md`.
- Describe risk and rollback notes for non-trivial changes.
- Call out assumptions and follow-up work clearly.

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

