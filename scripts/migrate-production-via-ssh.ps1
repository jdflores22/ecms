# Apply ATW / withdrawal schema on Hostinger MySQL via SSH (bypasses Remote MySQL IP whitelist).
#
# Hostinger shared hosting blocks mysql CLI from your home IP unless Remote MySQL is configured.
# From SSH on the same account, mysql usually connects via localhost.
#
# Usage:
#   $env:HOSTINGER_SSH_PASSWORD = "your-hostinger-ssh-password"
#   .\scripts\migrate-production-via-ssh.ps1
#
# Or enter SSH password when scp/plink prompts (OpenSSH scp + ssh).

param(
    [string]$SqlFile = "",
    [string]$SshUser = "u910121167_HVdBWy0pE",
    [string]$SshHost = "82.25.100.95",
    [int]$SshPort = 65002,
    [string]$IdentityFile = "",
    [string]$MySqlHostOnServer = "localhost"
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root "backend\ECMS.API\.env.production"
if (-not $SqlFile) {
    $SqlFile = Join-Path $root "scripts\withdrawal-migrations-idempotent.sql"
}

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

if (-not (Test-Path $envFile)) {
    Write-Error "Missing $envFile — copy .env.production.example and set MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE."
}
if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
}

$envVars = Read-EnvFile $envFile
$dbUser = $envVars["MYSQL_USER"]
$dbPass = $envVars["MYSQL_PASSWORD"]
$dbName = $envVars["MYSQL_DATABASE"]
if (-not $dbUser -or -not $dbPass -or -not $dbName) {
    Write-Error "Set MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE in .env.production (must match hPanel database user)."
}

if (-not $IdentityFile) {
    $defaultKey = Join-Path $env:USERPROFILE ".ssh\hostinger_ecms"
    if (Test-Path $defaultKey) { $IdentityFile = $defaultKey }
}

$remoteSql = "/tmp/ecms-withdrawal-migrate.sql"
$remoteCnf = "/tmp/ecms-mysql-client.cnf"
$localCnf = Join-Path $env:TEMP "ecms-remote-mysql-$(Get-Random).cnf"

@"
[client]
host=$MySqlHostOnServer
user=$dbUser
password=$dbPass
database=$dbName
"@ | Set-Content -Path $localCnf -Encoding ASCII -NoNewline

Write-Host "Uploading migration SQL and DB credentials to Hostinger..." -ForegroundColor Cyan
Write-Host "  SQL: $SqlFile" -ForegroundColor DarkGray
Write-Host "  SSH: ${SshUser}@${SshHost}:${SshPort}" -ForegroundColor DarkGray

$usePlink = $env:HOSTINGER_SSH_PASSWORD -and (Get-Command plink -ErrorAction SilentlyContinue) -and (Get-Command pscp -ErrorAction SilentlyContinue)

try {
    if ($usePlink) {
        Write-Host "Using PuTTY (HOSTINGER_SSH_PASSWORD)." -ForegroundColor DarkGray
        $pw = $env:HOSTINGER_SSH_PASSWORD
        & pscp -P $SshPort -pw $pw -batch $SqlFile "${SshUser}@${SshHost}:${remoteSql}"
        if ($LASTEXITCODE -ne 0) { exit 1 }
        & pscp -P $SshPort -pw $pw -batch $localCnf "${SshUser}@${SshHost}:${remoteCnf}"
        if ($LASTEXITCODE -ne 0) { exit 1 }

        $remoteCmd = "chmod 600 $remoteCnf && mysql --defaults-extra-file=$remoteCnf < $remoteSql && rm -f $remoteSql $remoteCnf && echo MIGRATION_OK"
        & plink -P $SshPort -pw $pw -batch "${SshUser}@${SshHost}" $remoteCmd
        if ($LASTEXITCODE -ne 0) { exit 1 }
    } else {
        $scpBase = @("-P", "$SshPort")
        if ($IdentityFile) { $scpBase += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes") }
        Write-Host "Enter Hostinger SSH password when prompted (upload + import)." -ForegroundColor Yellow
        & scp @scpBase $SqlFile "${SshUser}@${SshHost}:${remoteSql}"
        if ($LASTEXITCODE -ne 0) { exit 1 }
        & scp @scpBase $localCnf "${SshUser}@${SshHost}:${remoteCnf}"
        if ($LASTEXITCODE -ne 0) { exit 1 }

        $remoteCmd = "chmod 600 $remoteCnf && mysql --defaults-extra-file=$remoteCnf < $remoteSql && rm -f $remoteSql $remoteCnf && echo MIGRATION_OK"
        if ($IdentityFile) {
            & ssh -p $SshPort -i $IdentityFile -o IdentitiesOnly=yes "${SshUser}@${SshHost}" $remoteCmd
        } else {
            & ssh -p $SshPort "${SshUser}@${SshHost}" $remoteCmd
        }
        if ($LASTEXITCODE -ne 0) { exit 1 }
    }

    Write-Host ""
    Write-Host "Migration applied on Hostinger MySQL." -ForegroundColor Green
    Write-Host "Verify production API (wait ~30s if cached):" -ForegroundColor Cyan
    Write-Host "  https://ecms-production-42be.up.railway.app/api/withdrawals/pending-action/count" -ForegroundColor DarkGray
} finally {
    Remove-Item $localCnf -Force -ErrorAction SilentlyContinue
}
