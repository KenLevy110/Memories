param(
    [string]$SourceDir = "C:\Users\Ken Levy\.cursor\projects\c-Users-Ken-Levy-OneDrive-Documents-Business-Ohana-Memories\agent-transcripts",
    [string]$DestinationDir = "docs\agent-chats"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (!(Test-Path -Path $SourceDir -PathType Container)) {
    throw "Source transcript directory not found: $SourceDir"
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
