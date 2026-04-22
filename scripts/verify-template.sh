#!/usr/bin/env bash
set -euo pipefail

strict=false
if [[ "${1:-}" == "--strict" ]]; then
  strict=true
fi

required_files=(
  "README.md"
  "AGENTS.md"
  "NEW_PROJECT_CHECKLIST.md"
  "CONTRIBUTING.md"
  "LICENSE"
  "SECURITY.md"
  "CODE_OF_CONDUCT.md"
  ".github/PULL_REQUEST_TEMPLATE.md"
  ".github/CODEOWNERS"
)

missing=()
for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    missing+=("$file")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "Missing required files:"
  printf ' - %s\n' "${missing[@]}"
  exit 1
fi

if grep -RInE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=scripts "cursor-template|@your-org|security@example.com" .; then
  echo "Potential placeholder values found. Review before shipping."
  if [[ "$strict" == "true" ]]; then
    echo "Strict mode enabled and placeholders were found."
    exit 1
  fi
else
  echo "No common placeholders found."
fi

echo "Template verification complete."
