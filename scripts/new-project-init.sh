#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/new-project-init.sh <project-name>"
  exit 1
fi

project_name="$1"
echo "Initializing template for project: ${project_name}"

files_to_update=(
  "README.md"
  "NEW_PROJECT_CHECKLIST.md"
  "SECURITY.md"
  "CODE_OF_CONDUCT.md"
  ".github/CODEOWNERS"
)

for file in "${files_to_update[@]}"; do
  if [[ -f "$file" ]]; then
    if grep -q "cursor-template" "$file"; then
      sed -i.bak "s/cursor-template/${project_name//\//\\/}/g" "$file"
      rm -f "${file}.bak"
      echo "Updated placeholders in ${file}"
    fi
  fi
done

echo "Done. Next step: run scripts/verify-template.sh"
