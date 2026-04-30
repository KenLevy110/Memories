# Documentation layout smoke check (Windows / PowerShell). Linux/macOS/Git Bash: use scripts/check-docs.sh
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Fail([string]$Message) {
    Write-Error "check-docs: $Message"
    exit 1
}

if (!(Test-Path -Path "docs/templates" -PathType Container)) { Fail "docs/templates missing" }
$templates = @(Get-ChildItem -Path "docs/templates" -Filter "*.md" -File)
if ($templates.Count -lt 1) { Fail "no markdown templates in docs/templates" }

if (!(Test-Path ".cursor/rules/docs-governance.mdc")) { Fail ".cursor/rules/docs-governance.mdc missing" }
if (!(Test-Path "docs/agent-chats/README.md")) { Fail "docs/agent-chats/README.md missing" }
if (!(Test-Path "scripts/sync-agent-chats.sh")) { Fail "scripts/sync-agent-chats.sh missing" }
if (!(Test-Path "scripts/sync-agent-chats.ps1")) { Fail "scripts/sync-agent-chats.ps1 missing" }
if (!(Test-Path "scripts/check-docs.sh")) { Fail "scripts/check-docs.sh missing" }
if (!(Test-Path "scripts/sync-agent-chats.local.env.example")) { Fail "scripts/sync-agent-chats.local.env.example missing" }
if (!(Test-Path ".github/workflows/migrate.yml")) { Fail ".github/workflows/migrate.yml missing" }

Write-Host "check-docs: OK"
