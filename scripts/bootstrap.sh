#!/usr/bin/env bash
set -euo pipefail

echo "Bootstrapping project..."

if [[ -f package.json ]]; then
  echo "Installing dependencies with npm ci..."
  npm ci

  echo "Running lint/typecheck/tests when scripts are present..."
  npm run lint --if-present
  npm run typecheck --if-present
  npm test --if-present
else
  echo "No package.json found at repo root. Skipping Node bootstrap."
fi

if [[ -f .env.example ]] && command -v node >/dev/null 2>&1; then
  echo "Checking .env keys against .env.example (warnings only; use node scripts/check-env.mjs --strict to fail)..."
  node scripts/check-env.mjs
fi

echo "Bootstrap complete."

