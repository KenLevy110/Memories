Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$mjs = Join-Path $ScriptDir "setup-git-hooks.mjs"

if ((Test-Path -LiteralPath $mjs) -and (Get-Command node -ErrorAction SilentlyContinue)) {
    node $mjs
} else {
    git -C $RepoRoot config core.hooksPath .githooks
    Write-Host "Configured git hooks path to .githooks"
}

Write-Host "Hooks will now run from versioned files in this repository."
