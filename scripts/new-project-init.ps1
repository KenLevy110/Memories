param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectName
)

$ErrorActionPreference = "Stop"

Write-Host "Initializing template for project: $ProjectName"

$root = Get-Location
$filesToUpdate = @(
  "README.md",
  "NEW_PROJECT_CHECKLIST.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  ".github/CODEOWNERS"
)

foreach ($file in $filesToUpdate) {
  $path = Join-Path $root $file
  if (Test-Path $path) {
    $content = Get-Content $path -Raw
    $updated = $content.Replace("cursor-template", $ProjectName)
    if ($updated -ne $content) {
      Set-Content -Path $path -Value $updated -NoNewline
      Write-Host "Updated placeholders in $file"
    }
  }
}

Write-Host "Done. Next step: run scripts/verify-template.ps1"
