# Apply EF Core migrations to Hostinger (or any remote) MySQL.
#
# Usage:
#   .\scripts\migrate-production-mysql.ps1
#   .\scripts\migrate-production-mysql.ps1 -SeedFromLocal

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
    exit 1
}

$envVars = Read-EnvFile $envFile

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

if ($envVars["JWT_KEY"]) {
    $env:Jwt__Key = $envVars["JWT_KEY"]
}

$env:ConnectionStrings__DefaultConnection = $conn
$env:ASPNETCORE_ENVIRONMENT = "Production"

$port = if ($envVars["MYSQL_PORT"]) { $envVars["MYSQL_PORT"] } else { "3306" }
$clientCfg = @{
    Host     = $envVars["MYSQL_HOST"]
    Port     = $port
    User     = $envVars["MYSQL_USER"]
    Password = $envVars["MYSQL_PASSWORD"]
    Database = $envVars["MYSQL_DATABASE"]
}

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
            Write-Host "  1. hPanel -> Databases -> your DB -> reset MySQL user password, update .env.production (quote password if it contains #)" -ForegroundColor Yellow
            Write-Host "  2. hPanel -> Remote MySQL -> add your public IP (current connection from your PC must be allowed)" -ForegroundColor Yellow
            Write-Host "  3. phpMyAdmin uses the same username/password: https://h5g5-db.hstgr.io/" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Alternative: import scripts/ecms-schema.sql via phpMyAdmin -> Import tab." -ForegroundColor Cyan
            exit 1
        }
        Write-Host "MySQL connection OK." -ForegroundColor Green
    } finally {
        Remove-Item $cnf -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "XAMPP mysql.exe not found - skipping connection test." -ForegroundColor DarkYellow
}

Write-Host "Applying EF Core migrations (Production)..." -ForegroundColor Cyan
Push-Location (Join-Path $root "backend")
dotnet ef database update --project ECMS.Persistence --startup-project ECMS.API
$migrateExit = $LASTEXITCODE
Pop-Location

if ($migrateExit -ne 0) {
    Write-Host "Migration failed." -ForegroundColor Red
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
    Write-Host "Schema only. Demo data is created when the API starts with empty tables." -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "Next: deploy the API with ASPNETCORE_ENVIRONMENT=Production." -ForegroundColor Cyan
