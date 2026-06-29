# Apply EF Core migrations to Hostinger (or any remote) MySQL.
#
# Usage:
#   .\scripts\migrate-production-mysql.ps1
#   .\scripts\migrate-production-mysql.ps1 -SeedFromLocal
#
# Requires backend/ECMS.API/.env.production (copy from .env.production.example).
# Migrations use EcmsDbContextFactory and do NOT require the full API to start.

param(
    [switch]$SeedFromLocal
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$apiDir = Join-Path $root "backend\ECMS.API"
$envFile = Join-Path $apiDir ".env.production"
$mysql = "c:\xampp\mysql\bin\mysql.exe"
$mysqldump = "c:\xampp\mysql\bin\mysqldump.exe"

function Read-EnvFile([string]$path) {
    $vars = @{}
    if (-not (Test-Path $path)) { return $vars }
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $eq = $line.IndexOf("=")
        if ($eq -lt 1) { return }
        $key = $line.Substring(0, $eq).Trim()
        $val = $line.Substring($eq + 1).Trim()
        if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
            $val = $val.Substring(1, $val.Length - 2)
        }
        $vars[$key] = $val
    }
    return $vars
}

function Apply-EnvToProcess([hashtable]$vars) {
    foreach ($entry in $vars.GetEnumerator()) {
        if ([string]::IsNullOrEmpty([Environment]::GetEnvironmentVariable($entry.Key))) {
            [Environment]::SetEnvironmentVariable($entry.Key, [string]$entry.Value, "Process")
        }
    }

    if ([string]::IsNullOrEmpty($env:LOGICTECK_API_KEY) -and $vars["Logicteck__ApiKey"]) {
        $env:LOGICTECK_API_KEY = $vars["Logicteck__ApiKey"]
    }
    if ([string]::IsNullOrEmpty($env:Jwt__Key) -and $vars["JWT_KEY"]) {
        $env:Jwt__Key = $vars["JWT_KEY"]
    }
}

function Parse-MySqlClientConfig([string]$connectionString, [hashtable]$vars) {
    if ($vars["MYSQL_HOST"]) {
        return @{
            Host     = $vars["MYSQL_HOST"]
            Port     = if ($vars["MYSQL_PORT"]) { $vars["MYSQL_PORT"] } else { "3306" }
            User     = $vars["MYSQL_USER"]
            Password = $vars["MYSQL_PASSWORD"]
            Database = $vars["MYSQL_DATABASE"]
        }
    }

    $map = @{}
    foreach ($part in ($connectionString -split ';')) {
        if ($part -match '^\s*(.+?)=(.*)$') {
            $map[$Matches[1].Trim().ToLowerInvariant()] = $Matches[2].Trim()
        }
    }

    return @{
        Host     = $(if ($map.ContainsKey("server")) { $map["server"] } elseif ($map.ContainsKey("host")) { $map["host"] } else { "" })
        Port     = if ($map.ContainsKey("port")) { $map["port"] } else { "3306" }
        User     = $(if ($map.ContainsKey("user")) { $map["user"] } elseif ($map.ContainsKey("userid")) { $map["userid"] } else { "" })
        Password = if ($map.ContainsKey("password")) { $map["password"] } else { "" }
        Database = if ($map.ContainsKey("database")) { $map["database"] } else { "" }
    }
}

function New-MySqlDefaultsFile([hashtable]$cfg) {
    $path = Join-Path $env:TEMP "ecms-mysql-$(Get-Random).cnf"
    @"
[client]
host=$($cfg.Host)
port=$($cfg.Port)
user=$($cfg.User)
password=$($cfg.Password)
database=$($cfg.Database)
"@ | Set-Content -Path $path -Encoding ASCII
    return $path
}

if (-not (Test-Path $envFile)) {
    Write-Host "Missing $envFile" -ForegroundColor Red
    Write-Host "Copy backend/ECMS.API/.env.production.example to .env.production and fill in Hostinger MySQL + JWT_KEY + Logicteck__ApiKey." -ForegroundColor Yellow
    exit 1
}

$envVars = Read-EnvFile $envFile
Apply-EnvToProcess $envVars

if ($envVars["ConnectionStrings__DefaultConnection"]) {
    $conn = $envVars["ConnectionStrings__DefaultConnection"]
} else {
    foreach ($key in @("MYSQL_HOST", "MYSQL_DATABASE", "MYSQL_USER", "MYSQL_PASSWORD")) {
        if (-not $envVars[$key]) {
            Write-Error "Missing $key in .env.production"
        }
    }
    if ($envVars["MYSQL_HOST"] -match "REPLACE_WITH") {
        Write-Error "Set MYSQL_HOST in .env.production to the MySQL hostname from Hostinger hPanel (not localhost)."
    }
    $port = if ($envVars["MYSQL_PORT"]) { $envVars["MYSQL_PORT"] } else { "3306" }
    $pwd = $envVars["MYSQL_PASSWORD"]
    $conn = "Server=$($envVars['MYSQL_HOST']);Port=$port;Database=$($envVars['MYSQL_DATABASE']);User=$($envVars['MYSQL_USER']);Password=$pwd;SslMode=Required;"
}

$env:ConnectionStrings__DefaultConnection = $conn

$clientCfg = Parse-MySqlClientConfig $conn $envVars

Write-Host "Testing MySQL connection to $($clientCfg.Host)..." -ForegroundColor Cyan
if (Test-Path $mysql) {
    $cnf = New-MySqlDefaultsFile $clientCfg
    try {
        $mysqlOut = & $mysql --defaults-extra-file=$cnf -e "SELECT 1 AS ok;" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Cannot connect to Hostinger MySQL." -ForegroundColor Red
            if ($mysqlOut) { Write-Host $mysqlOut -ForegroundColor Red }
            Write-Host ""
            Write-Host "If you see Access denied:" -ForegroundColor Yellow
            Write-Host "  1. hPanel -> Databases -> reset MySQL password, update .env.production (quote password if it contains #)" -ForegroundColor Yellow
            Write-Host "  2. hPanel -> Remote MySQL -> add your public IP" -ForegroundColor Yellow
            Write-Host "  3. Or import scripts/withdrawal-migrations-idempotent.sql via phpMyAdmin: https://h5g5-db.hstgr.io/" -ForegroundColor Yellow
            exit 1
        }
        Write-Host "MySQL connection OK." -ForegroundColor Green
    } finally {
        Remove-Item $cnf -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "XAMPP mysql.exe not found - skipping connection test." -ForegroundColor DarkYellow
}

Write-Host "Applying EF Core migrations..." -ForegroundColor Cyan
Push-Location (Join-Path $root "backend")
dotnet ef database update --project ECMS.Persistence --startup-project ECMS.API
$migrateExit = $LASTEXITCODE
Pop-Location

if ($migrateExit -ne 0) {
    Write-Host "Migration failed." -ForegroundColor Red
    Write-Host "Fallback: import scripts/withdrawal-migrations-idempotent.sql in phpMyAdmin." -ForegroundColor Yellow
    exit $migrateExit
}

Write-Host "Migrations applied successfully." -ForegroundColor Green

if ($SeedFromLocal) {
    if (-not (Test-Path $mysqldump)) {
        Write-Error "mysqldump not found at $mysqldump"
    }
    $dumpFile = Join-Path $env:TEMP "ecms-seed-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
    Write-Host "Exporting local ecms data (no schema)..." -ForegroundColor Cyan
    & $mysqldump -u root --no-create-info --skip-triggers ecms > $dumpFile
    if ($LASTEXITCODE -ne 0) { exit 1 }

    Write-Host "Importing into production database..." -ForegroundColor Cyan
    $cnf = New-MySqlDefaultsFile $clientCfg
    try {
        Get-Content $dumpFile -Raw | & $mysql --defaults-extra-file=$cnf 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Import failed. Start the API once in Production to seed empty tables instead." -ForegroundColor Yellow
            exit 1
        }
        Write-Host "Local data imported into production." -ForegroundColor Green
    } finally {
        Remove-Item $cnf -Force -ErrorAction SilentlyContinue
        Remove-Item $dumpFile -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host ""
    Write-Host "Schema only. Role/page seed sync runs when the production API starts." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Next: redeploy Railway (git push) or restart the API so seed sync runs." -ForegroundColor Cyan
