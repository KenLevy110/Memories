Write-Host "Bootstrapping project..."

if (Test-Path "package.json") {
  Write-Host "Installing dependencies with npm ci..."
  npm ci

  Write-Host "Running lint/typecheck/tests when scripts are present..."
  npm run lint --if-present
  npm run typecheck --if-present
  npm test --if-present
} else {
  Write-Host "No package.json found at repo root. Skipping Node bootstrap."
}

Write-Host "Bootstrap complete."

