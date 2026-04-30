#!/usr/bin/env bash
# Smoke-check documentation layout and governance files (runs in CI).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

err() {
  echo "check-docs: $*" >&2
  exit 1
}

[[ -d docs/templates ]] || err "docs/templates missing"

shopt -s nullglob
templates=(docs/templates/*.md)
((${#templates[@]})) || err "no markdown templates in docs/templates"

[[ -f .cursor/rules/docs-governance.mdc ]] || err ".cursor/rules/docs-governance.mdc missing"
[[ -f docs/agent-chats/README.md ]] || err "docs/agent-chats/README.md missing"
[[ -f scripts/sync-agent-chats.sh ]] || err "scripts/sync-agent-chats.sh missing"
[[ -f scripts/sync-agent-chats.ps1 ]] || err "scripts/sync-agent-chats.ps1 missing"
[[ -f scripts/check-docs.ps1 ]] || err "scripts/check-docs.ps1 missing"
[[ -f scripts/sync-agent-chats.local.env.example ]] || err "scripts/sync-agent-chats.local.env.example missing"
[[ -f .github/workflows/migrate.yml ]] || err ".github/workflows/migrate.yml missing"

echo "check-docs: OK"
