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

if ((Test-Path ".env.example") -and (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Checking .env keys against .env.example (warnings only; use node scripts/check-env.mjs --strict to fail)..."
  node scripts/check-env.mjs
}

Write-Host "Bootstrap complete."

