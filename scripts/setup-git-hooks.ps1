Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

git config core.hooksPath .githooks
Write-Host "Configured git hooks path to .githooks"
Write-Host "Hooks will now run from versioned files in this repository."
