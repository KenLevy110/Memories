param(
    [switch]$Strict,
    [string]$SourceDir = "",
    [string]$DestinationDir = "docs\agent-chats"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$LocalEnv = Join-Path $ScriptDir "sync-agent-chats.local.env"
if (Test-Path -Path $LocalEnv) {
    Get-Content -Path $LocalEnv | ForEach-Object {
        $line = $_.Trim()
        if ($line -match '^\s*#' -or $line -eq "") { return }
        if ($line -match '^([^\s=]+)\s*=\s*(.*)$') {
            $key = $matches[1].Trim()
            $val = $matches[2].Trim().Trim('"')
            Set-Item -Path "Env:$key" -Value $val
        }
    }
}

if (-not $SourceDir) {
    if ($env:CURSOR_AGENT_TRANSCRIPTS_DIR) {
        $SourceDir = $env:CURSOR_AGENT_TRANSCRIPTS_DIR
    }
}

if (-not $SourceDir) {
    $msg = "Set CURSOR_AGENT_TRANSCRIPTS_DIR or copy scripts/sync-agent-chats.local.env.example to scripts/sync-agent-chats.local.env"
    if ($Strict) {
        throw $msg
    }
    Write-Warning "sync-agent-chats: $msg. Skipping."
    exit 0
}

if (!(Test-Path -Path $SourceDir -PathType Container)) {
    $msg = "Source transcript directory not found: $SourceDir (check CURSOR_AGENT_TRANSCRIPTS_DIR or sync-agent-chats.local.env)"
    if ($Strict) {
        throw $msg
    }
    Write-Warning $msg
    exit 0
}

if (!(Test-Path -Path $DestinationDir -PathType Container)) {
    New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
}

$sourceFiles = @(Get-ChildItem -Path $SourceDir -Filter "*.jsonl" -File -Recurse)

if ($sourceFiles.Count -eq 0) {
    Write-Host "No transcript files found in source directory."
    exit 0
}

foreach ($sourceFile in $sourceFiles) {
    Copy-Item -Path $sourceFile.FullName -Destination (Join-Path $DestinationDir $sourceFile.Name) -Force
}

$copiedCount = (Get-ChildItem -Path $DestinationDir -Filter "*.jsonl" -File).Count
Write-Host "Synced transcript files to $DestinationDir"
Write-Host "Current transcript count: $copiedCount"
