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

echo "Bootstrap complete."

