param(
  [string]$DataDir = "$env:LOCALAPPDATA/Memories/dev-postgres",
  [int]$Port = 55432,
  [string]$Superuser = "postgres",
  [string]$DatabaseName = "memories",
  [string]$TestDatabaseName = "memories_test",
  [string]$PostgresPassword = "",
  [switch]$ForceEnvWrite,
  [switch]$SkipEnvWrite
)

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

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
  param([string]$Content, [string]$Key, [string]$Value)
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

function Get-EnvValue {
  param([string]$Content, [string]$Key)
  $pattern = "(?m)^" + [regex]::Escape($Key) + "=(.*)$"
  $match = [regex]::Match($Content, $pattern)
  if ($match.Success) {
    return $match.Groups[1].Value.Trim()
  }
  return $null
}

function Parse-PostgresUrl {
  param([string]$Url)
  if (-not $Url) {
    return $null
  }
  try {
    $uri = [System.Uri]$Url
  } catch {
    return $null
  }
  if ($uri.Scheme -notin @("postgres", "postgresql")) {
    return $null
  }

  $username = $null
  $password = $null
  if ($uri.UserInfo) {
    $parts = $uri.UserInfo -split ":", 2
    if ($parts.Count -ge 1) { $username = [System.Uri]::UnescapeDataString($parts[0]) }
    if ($parts.Count -eq 2) { $password = [System.Uri]::UnescapeDataString($parts[1]) }
  }

  return @{
    Host = $uri.Host
    Port = if ($uri.Port -gt 0) { $uri.Port } else { 5432 }
    Username = $username
    Password = $password
    Database = $uri.AbsolutePath.TrimStart("/")
  }
}

function New-StrongPassword {
  $bytes = New-Object byte[] 16
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  return "dev-" + ([Convert]::ToHexString($bytes).ToLowerInvariant()) + "!"
}

function Set-PostgresConfValue {
  param([string]$Path, [string]$Key, [string]$Value, [bool]$Quoted)
  $content = Get-Content $Path -Raw
  $renderedValue = if ($Quoted) { "'$Value'" } else { "$Value" }
  $line = "$Key = $renderedValue"
  $pattern = "(?m)^\s*#?\s*" + [regex]::Escape($Key) + "\s*=.*$"
  if ($content -match $pattern) {
    $next = [regex]::Replace($content, $pattern, $line)
  } else {
    $next = $content
    if (-not $next.EndsWith("`n")) { $next += "`n" }
    $next += $line + "`n"
  }
  if ($next -ne $content) {
    Set-Content -Path $Path -Value $next -NoNewline
    return $true
  }
  return $false
}

function Set-PgHbaAuthMode {
  param([string]$Path, [string]$Mode)
  $content = Get-Content $Path -Raw
  $original = $content
  $content = [regex]::Replace($content, "(?m)^(local\s+all\s+all\s+)\S+\s*$", '$1' + $Mode)
  $content = [regex]::Replace($content, "(?m)^(host\s+all\s+all\s+127\.0\.0\.1/32\s+)\S+\s*$", '$1' + $Mode)
  $content = [regex]::Replace($content, "(?m)^(host\s+all\s+all\s+::1/128\s+)\S+\s*$", '$1' + $Mode)
  if ($content -ne $original) {
    Set-Content -Path $Path -Value $content -NoNewline
    return $true
  }
  return $false
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
$envContent = if (Test-Path $envPath) { Get-Content $envPath -Raw } else { "" }

$existingDatabaseUrl = Get-EnvValue -Content $envContent -Key "DATABASE_URL"
$existingDatabaseConnection = Parse-PostgresUrl -Url $existingDatabaseUrl
if ($existingDatabaseConnection -and $existingDatabaseConnection.Host -notin @("localhost", "127.0.0.1", "::1")) {
  throw "setup-dev-db manages local clusters only. Existing DATABASE_URL host '$($existingDatabaseConnection.Host)' is non-local."
}

if (-not $PostgresPassword) {
  if (-not $ForceEnvWrite -and $existingDatabaseConnection -and $existingDatabaseConnection.Password) {
    $PostgresPassword = $existingDatabaseConnection.Password
  } else {
    $PostgresPassword = New-StrongPassword
  }
}

$pgBin = Get-PgBinDirectory
$initdb = Join-Path $pgBin "initdb.exe"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$psql = Join-Path $pgBin "psql.exe"

$resolvedDataDir = [System.IO.Path]::GetFullPath($DataDir)
$dataDirParent = Split-Path $resolvedDataDir -Parent
if (-not (Test-Path $dataDirParent)) {
  New-Item -ItemType Directory -Path $dataDirParent -Force | Out-Null
}

$pgVersionFile = Join-Path $resolvedDataDir "PG_VERSION"
if (-not (Test-Path $pgVersionFile)) {
  $passwordFile = [System.IO.Path]::GetTempFileName()
  Set-Content -Path $passwordFile -Value $PostgresPassword -NoNewline
  Write-Host "Initializing local PostgreSQL cluster at $resolvedDataDir"
  & $initdb -D $resolvedDataDir -U $Superuser -A scram-sha-256 --auth-host=scram-sha-256 --auth-local=scram-sha-256 --pwfile=$passwordFile | Out-Host
  Remove-Item $passwordFile -Force -ErrorAction SilentlyContinue
}

$postgresqlConfPath = Join-Path $resolvedDataDir "postgresql.conf"
$pgHbaPath = Join-Path $resolvedDataDir "pg_hba.conf"
$logPath = Join-Path "$env:LOCALAPPDATA/Memories" "dev-postgres.log"

$configChanged = $false
$configChanged = (Set-PostgresConfValue -Path $postgresqlConfPath -Key "listen_addresses" -Value "localhost" -Quoted $true) -or $configChanged
$configChanged = (Set-PostgresConfValue -Path $postgresqlConfPath -Key "password_encryption" -Value "scram-sha-256" -Quoted $true) -or $configChanged
$configChanged = (Set-PostgresConfValue -Path $postgresqlConfPath -Key "port" -Value $Port -Quoted $false) -or $configChanged
$configChanged = (Set-PgHbaAuthMode -Path $pgHbaPath -Mode "scram-sha-256") -or $configChanged

& $pgCtl -D $resolvedDataDir status 2>&1 | Out-Null
$isRunning = $LASTEXITCODE -eq 0
if (-not $isRunning) {
  Write-Host "Starting local PostgreSQL on port $Port"
  & $pgCtl -D $resolvedDataDir -l $logPath start -w | Out-Host
} elseif ($configChanged) {
  Write-Host "Restarting local PostgreSQL to apply hardened settings"
  & $pgCtl -D $resolvedDataDir restart -w | Out-Host
} else {
  Write-Host "Local PostgreSQL already running at $resolvedDataDir"
}

$hadPgPassword = Test-Path Env:PGPASSWORD
$originalPgPassword = $env:PGPASSWORD
try {
  $env:PGPASSWORD = $PostgresPassword
  $probe = & $psql -h localhost -p $Port -U $Superuser -d postgres -w -tAc "select 1" 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to authenticate to local dev cluster with provided password. If needed, run with -PostgresPassword <current-password>."
  }

  $escapedPassword = $PostgresPassword.Replace("'", "''")
  & $psql -h localhost -p $Port -U $Superuser -d postgres -w -v ON_ERROR_STOP=1 -tAc "alter role `"$Superuser`" with password '$escapedPassword';" | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to enforce password on local postgres superuser."
  }

  $existsMain = (& $psql -h localhost -p $Port -U $Superuser -d postgres -w -tAc "select 1 from pg_database where datname = '$DatabaseName'" 2>$null).Trim()
  if ($existsMain -ne "1") {
    Write-Host "Creating database $DatabaseName"
    & $psql -h localhost -p $Port -U $Superuser -d postgres -w -v ON_ERROR_STOP=1 -c "create database `"$DatabaseName`";" | Out-Null
  }

  $existsTest = (& $psql -h localhost -p $Port -U $Superuser -d postgres -w -tAc "select 1 from pg_database where datname = '$TestDatabaseName'" 2>$null).Trim()
  if ($existsTest -ne "1") {
    Write-Host "Creating database $TestDatabaseName"
    & $psql -h localhost -p $Port -U $Superuser -d postgres -w -v ON_ERROR_STOP=1 -c "create database `"$TestDatabaseName`";" | Out-Null
  }
} finally {
  if ($hadPgPassword) {
    $env:PGPASSWORD = $originalPgPassword
  } else {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
  }
}

$encodedPassword = [System.Uri]::EscapeDataString($PostgresPassword)
$databaseUrl = "postgres://${Superuser}:${encodedPassword}@localhost:$Port/$DatabaseName"
$testDatabaseUrl = "postgres://${Superuser}:${encodedPassword}@localhost:$Port/$TestDatabaseName"

if (-not $SkipEnvWrite) {
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
  Write-Host "Updated .env with hardened local DATABASE_URL values."
}

Write-Host "Local PostgreSQL cluster hardened (scram-sha-256, localhost-only)."
Write-Host "Configured databases: $DatabaseName, $TestDatabaseName on port $Port."
