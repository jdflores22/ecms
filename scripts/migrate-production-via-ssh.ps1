# Apply ATW / withdrawal schema on Hostinger MySQL via SSH.
#
# Usage:
#   $env:HOSTINGER_SSH_PASSWORD = "your-hostinger-ssh-password"
#   .\scripts\migrate-production-via-ssh.ps1

param(
    [string]$SqlFile = "",
    [string]$SshUser = "u910121167_HVdBWy0pE",
    [string]$SshHost = "82.25.100.95",
    [int]$SshPort = 65002,
    [string]$IdentityFile = "",
    [string]$MySqlHostOnServer = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root "backend\ECMS.API\.env.production"
$runnerSh = Join-Path $root "scripts\hostinger-apply-withdrawal-sql.sh"
if (-not $SqlFile) {
    $SqlFile = Join-Path $root "scripts\withdrawal-schema-direct.sql"
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
    Write-Error "Missing $envFile - copy .env.production.example and set MYSQL_* values."
}
if (-not (Test-Path $SqlFile)) {
    Write-Error "SQL file not found: $SqlFile"
}
if (-not (Test-Path $runnerSh)) {
    Write-Error "Missing $runnerSh"
}

$envVars = Read-EnvFile $envFile
$dbUser = $envVars["MYSQL_USER"]
$dbPass = $envVars["MYSQL_PASSWORD"]
$dbName = $envVars["MYSQL_DATABASE"]
$dbHost = if ($MySqlHostOnServer) { $MySqlHostOnServer } else { $envVars["MYSQL_HOST"] }
if (-not $dbUser -or -not $dbPass -or -not $dbName -or -not $dbHost) {
    Write-Error "Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE in .env.production."
}

if (-not $IdentityFile) {
    $defaultKey = Join-Path $env:USERPROFILE ".ssh\hostinger_ecms"
    if (Test-Path $defaultKey) { $IdentityFile = $defaultKey }
}

$remoteSql = "/tmp/ecms-withdrawal-migrate.sql"
$remoteCnf = "/tmp/ecms-mysql-client.cnf"
$remoteSh = "/tmp/ecms-apply-withdrawal.sh"
$localCnf = Join-Path $env:TEMP "ecms-remote-mysql-$(Get-Random).cnf"

@(
    "[client]",
    "host=$dbHost",
    "user=$dbUser",
    "password=$dbPass",
    "database=$dbName"
) | Set-Content -Path $localCnf -Encoding ASCII

Write-Host "Uploading migration SQL to Hostinger..." -ForegroundColor Cyan
Write-Host "  SQL:  $SqlFile" -ForegroundColor DarkGray
Write-Host "  MySQL host: $dbHost" -ForegroundColor DarkGray
Write-Host ('  SSH:  {0}@{1}:{2}' -f $SshUser, $SshHost, $SshPort) -ForegroundColor DarkGray

$remoteCmd = "bash $remoteSh $remoteCnf $remoteSql"
$usePlink = $env:HOSTINGER_SSH_PASSWORD -and (Get-Command plink -ErrorAction SilentlyContinue) -and (Get-Command pscp -ErrorAction SilentlyContinue)

function Invoke-MigrateUpload {
    param([string[]]$ScpArgs, [string]$Local, [string]$Remote)
    & scp @ScpArgs $Local ('{0}@{1}:{2}' -f $SshUser, $SshHost, $Remote)
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

function Invoke-MigrateUploadPuTTY {
    param([string[]]$PscpArgs, [string]$Local, [string]$Remote)
    & pscp @PscpArgs $Local ('{0}@{1}:{2}' -f $SshUser, $SshHost, $Remote)
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

try {
    if ($usePlink) {
        Write-Host "Using PuTTY (HOSTINGER_SSH_PASSWORD)." -ForegroundColor DarkGray
        $pw = $env:HOSTINGER_SSH_PASSWORD
        $pscpBase = @("-P", "$SshPort", "-pw", $pw, "-batch")
        Invoke-MigrateUploadPuTTY $pscpBase $SqlFile $remoteSql
        Invoke-MigrateUploadPuTTY $pscpBase $localCnf $remoteCnf
        Invoke-MigrateUploadPuTTY $pscpBase $runnerSh $remoteSh

        $output = & plink -P $SshPort -pw $pw -batch ('{0}@{1}' -f $SshUser, $SshHost) $remoteCmd 2>&1
        Write-Host $output
        if ($LASTEXITCODE -ne 0 -or ($output -notmatch 'MIGRATION_OK')) {
            Write-Host "Migration failed. Import scripts\withdrawal-schema-direct.sql in phpMyAdmin instead." -ForegroundColor Red
            exit 1
        }
    } else {
        $scpBase = @("-P", "$SshPort")
        if ($IdentityFile) { $scpBase += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes") }
        Write-Host "Enter Hostinger SSH password when prompted." -ForegroundColor Yellow
        Invoke-MigrateUpload $scpBase $SqlFile $remoteSql
        Invoke-MigrateUpload $scpBase $localCnf $remoteCnf
        Invoke-MigrateUpload $scpBase $runnerSh $remoteSh

        $sshTarget = '{0}@{1}' -f $SshUser, $SshHost
        if ($IdentityFile) {
            $output = & ssh -p $SshPort -i $IdentityFile -o IdentitiesOnly=yes $sshTarget $remoteCmd 2>&1
        } else {
            $output = & ssh -p $SshPort $sshTarget $remoteCmd 2>&1
        }
        Write-Host $output
        if ($LASTEXITCODE -ne 0 -or ($output -notmatch 'MIGRATION_OK')) {
            Write-Host "Migration failed. Import scripts\withdrawal-schema-direct.sql in phpMyAdmin instead." -ForegroundColor Red
            exit 1
        }
    }

    Write-Host ""
    Write-Host "WithdrawalRequestsSet verified on Hostinger MySQL ($dbHost)." -ForegroundColor Green
} finally {
    Remove-Item $localCnf -Force -ErrorAction SilentlyContinue
}
