param(
  [switch]$Strict
)

$ErrorActionPreference = "Stop"

$requiredFiles = @(
  "README.md",
  "AGENTS.md",
  "NEW_PROJECT_CHECKLIST.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/CODEOWNERS",
  "brand/README.md",
  "brand/symbol-master.svg"
)

$missing = @()
foreach ($file in $requiredFiles) {
  if (-not (Test-Path $file)) {
    $missing += $file
  }
}

if ($missing.Count -gt 0) {
  Write-Error "Missing required files:`n- $($missing -join "`n- ")"
  exit 1
}

$excludePatterns = @("\.git\\", "node_modules\\", "^scripts\\")
$candidateFiles = Get-ChildItem -Recurse -File | Where-Object {
  $path = $_.FullName.Replace((Get-Location).Path + "\", "")
  -not ($excludePatterns | ForEach-Object { $path -match $_ } | Where-Object { $_ })
}

$placeholderMatches = $candidateFiles | Select-String -Pattern "cursor-template|@your-org|security@example.com"
if ($placeholderMatches) {
  Write-Warning "Potential placeholder values found:"
  $placeholderMatches | ForEach-Object {
    Write-Host "$($_.Path):$($_.LineNumber): $($_.Line.Trim())"
  }
  if ($Strict) {
    Write-Error "Strict mode enabled and placeholders were found."
    exit 1
  }
} else {
  Write-Host "No common placeholders found."
}

Write-Host "Template verification complete."
