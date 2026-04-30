param(
  [string]$DataDir = "$env:LOCALAPPDATA/Memories/dev-postgres",
  [int]$Port = 55432,
  [string]$Superuser = "postgres",
  [string]$DatabaseName = "memories",
  [string]$TestDatabaseName = "memories_test",
  [switch]$SkipEnvWrite
)

$ErrorActionPreference = "Stop"

function Get-PgBinDirectory {
  if ($env:PG_BIN -and (Test-Path (Join-Path $env:PG_BIN "initdb.exe"))) {
    return $env:PG_BIN
  }

  $installRoot = "C:/Program Files/PostgreSQL"
  if (Test-Path $installRoot) {
    $versions = Get-ChildItem $installRoot -Directory | Sort-Object Name -Descending
    foreach ($version in $versions) {
      $candidate = Join-Path $version.FullName "bin"
      if (Test-Path (Join-Path $candidate "initdb.exe")) {
        return $candidate
      }
    }
  }

  throw "PostgreSQL binaries not found. Install PostgreSQL or set PG_BIN to the bin directory."
}

function Set-OrAppendEnvValue {
  param(
    [string]$Content,
    [string]$Key,
    [string]$Value
  )

  $pattern = "(?m)^" + [regex]::Escape($Key) + "=.*$"
  $replacement = "$Key=$Value"

  if ($Content -match $pattern) {
    return [regex]::Replace($Content, $pattern, $replacement)
  }

  if (-not $Content.EndsWith("`n")) {
    $Content += "`n"
  }

  return $Content + $replacement + "`n"
}

$pgBin = Get-PgBinDirectory
$initdb = Join-Path $pgBin "initdb.exe"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$psql = Join-Path $pgBin "psql.exe"
$createdb = Join-Path $pgBin "createdb.exe"

$resolvedDataDir = [System.IO.Path]::GetFullPath($DataDir)
$dataDirParent = Split-Path $resolvedDataDir -Parent
if (-not (Test-Path $dataDirParent)) {
  New-Item -ItemType Directory -Path $dataDirParent -Force | Out-Null
}

$pgVersionFile = Join-Path $resolvedDataDir "PG_VERSION"
if (-not (Test-Path $pgVersionFile)) {
  Write-Host "Initializing local PostgreSQL cluster at $resolvedDataDir"
  & $initdb -D $resolvedDataDir -U $Superuser -A trust --auth-host=trust --auth-local=trust | Out-Host
}

$statusOutput = & $pgCtl -D $resolvedDataDir status 2>&1
if ($LASTEXITCODE -ne 0) {
  $logPath = Join-Path "$env:LOCALAPPDATA/Memories" "dev-postgres.log"
  Write-Host "Starting local PostgreSQL on port $Port"
  & $pgCtl -D $resolvedDataDir -l $logPath -o "-p $Port" start -w | Out-Host
} else {
  Write-Host "Local PostgreSQL already running at $resolvedDataDir"
}

function Ensure-Database {
  param([string]$Name)

  $query = "select 1 from pg_database where datname = '$Name';"
  $exists = (& $psql "postgresql://$Superuser@localhost:$Port/postgres" -tAc $query).Trim()
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to query database list for $Name."
  }

  if ($exists -ne "1") {
    Write-Host "Creating database $Name"
    & $createdb -h localhost -p $Port -U $Superuser $Name | Out-Host
  }
}

Ensure-Database -Name $DatabaseName
Ensure-Database -Name $TestDatabaseName

$databaseUrl = "postgres://$Superuser@localhost:$Port/$DatabaseName"
$testDatabaseUrl = "postgres://$Superuser@localhost:$Port/$TestDatabaseName"

if (-not $SkipEnvWrite) {
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  $envPath = Join-Path $repoRoot ".env"
  $envExamplePath = Join-Path $repoRoot ".env.example"

  if (-not (Test-Path $envPath)) {
    if (-not (Test-Path $envExamplePath)) {
      throw ".env.example not found at $envExamplePath"
    }
    Copy-Item $envExamplePath $envPath
  }

  $envContent = Get-Content $envPath -Raw
  $envContent = Set-OrAppendEnvValue -Content $envContent -Key "DATABASE_URL" -Value $databaseUrl
  $envContent = Set-OrAppendEnvValue -Content $envContent -Key "TEST_DATABASE_URL" -Value $testDatabaseUrl
  Set-Content -Path $envPath -Value $envContent -NoNewline

  Write-Host "Updated .env with DATABASE_URL and TEST_DATABASE_URL."
}

Write-Host "DATABASE_URL=$databaseUrl"
Write-Host "TEST_DATABASE_URL=$testDatabaseUrl"
