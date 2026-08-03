# Production deploy: Hostinger frontend (SCP) + Railway API (git push).
#
# Order:
#   1. npm run build
#   2. Upload dist/ to Hostinger public_html (zip + extract)
#   3. git push origin (Railway auto-redeploys the API from GitHub)
#
# Usage:
#   .\scripts\deploy-frontend-hostinger.ps1
#   .\scripts\deploy-frontend-hostinger.ps1 -ApiBaseUrl "https://ecms-production-42be.up.railway.app/api"
#   .\scripts\deploy-frontend-hostinger.ps1 -SkipGitPush
#   .\scripts\deploy-frontend-hostinger.ps1 -SkipBuild -SkipGitPush
#
# Auth (first match wins):
#   1. $env:HOSTINGER_SSH_PASSWORD + PuTTY pscp/plink
#   2. -IdentityFile / ~/.ssh/hostinger_ecms (may prompt for passphrase)
#   3. OpenSSH password prompt

param(
    [string]$RemotePath = "/home/u910121167/websites/HVdBWy0pE/public_html",
    [string]$ApiBaseUrl = "https://ecms-production-42be.up.railway.app/api",
    [string]$SshUser = "u910121167_HVdBWy0pE",
    [string]$SshHost = "82.25.100.95",
    [int]$SshPort = 65002,
    [string]$IdentityFile = "",
    [switch]$SkipGitPush,
    [switch]$SkipBuild,
    [int]$MaxRetries = 4
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"
$dist = Join-Path $frontend "dist"
$stagingZip = Join-Path $env:TEMP "ecms-frontend-deploy.zip"
$remoteZipName = "ecms-frontend-deploy.zip"

if (-not $IdentityFile) {
    $defaultKey = Join-Path $env:USERPROFILE ".ssh\hostinger_ecms"
    if (Test-Path $defaultKey) { $IdentityFile = $defaultKey }
}

$hasPassword = -not [string]::IsNullOrWhiteSpace($env:HOSTINGER_SSH_PASSWORD)
$pscpCmd = Get-Command pscp -ErrorAction SilentlyContinue
$plinkCmd = Get-Command plink -ErrorAction SilentlyContinue
$usePuttyPassword = $hasPassword -and $null -ne $pscpCmd -and $null -ne $plinkCmd

# Remote shell command (single-quoted so Windows PowerShell 5 never parses &&)
$remoteCmd = ('cd "{0}" ; unzip -o "{1}" ; rm -f "{1}" ; ls -la index.html assets | head -n 20' -f $RemotePath, $remoteZipName)

function Invoke-WithRetry {
    param(
        [scriptblock]$Action,
        [string]$Label,
        [int]$Retries = $MaxRetries
    )
    $attempt = 0
    while ($true) {
        $attempt++
        try {
            & $Action
            return
        } catch {
            if ($attempt -ge $Retries) { throw }
            $delay = [Math]::Min(20, 3 * $attempt)
            Write-Host ("  ! {0} failed (attempt {1}/{2}): {3}" -f $Label, $attempt, $Retries, $_.Exception.Message) -ForegroundColor Yellow
            Write-Host ("    Retrying in {0}s..." -f $delay) -ForegroundColor DarkYellow
            Start-Sleep -Seconds $delay
        }
    }
}

function Assert-ExitOk([string]$Label) {
    if ($LASTEXITCODE -ne 0) {
        throw ("{0} failed with exit code {1}" -f $Label, $LASTEXITCODE)
    }
}

Push-Location $root
try {
    if (-not $SkipBuild) {
        Write-Host ("Building frontend (API: {0})..." -f $ApiBaseUrl) -ForegroundColor Cyan
        Push-Location $frontend
        $env:VITE_API_BASE_URL = $ApiBaseUrl
        npm run build
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Pop-Location
    } else {
        Write-Host "Skipping build (using existing dist/)." -ForegroundColor DarkGray
    }

    if (-not (Test-Path $dist)) {
        Write-Error ("Build output not found: {0}" -f $dist)
    }

    Write-Host ""
    Write-Host "Packaging dist/ for upload..." -ForegroundColor Cyan
    if (Test-Path $stagingZip) { Remove-Item $stagingZip -Force }
    Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $stagingZip -CompressionLevel Optimal
    $zipMb = [math]::Round((Get-Item $stagingZip).Length / 1MB, 2)
    Write-Host ("  Package: {0} ({1} MB)" -f $stagingZip, $zipMb) -ForegroundColor DarkGray

    Write-Host ""
    Write-Host "Deploying frontend to Hostinger (zip -> public_html)..." -ForegroundColor Cyan

    if ($usePuttyPassword) {
        Write-Host "Auth: PuTTY + HOSTINGER_SSH_PASSWORD" -ForegroundColor DarkGray
        $pw = $env:HOSTINGER_SSH_PASSWORD
        $remoteTarget = ("{0}@{1}:{2}/{3}" -f $SshUser, $SshHost, $RemotePath, $remoteZipName)

        Invoke-WithRetry -Label "upload zip" -Action {
            & pscp -P $SshPort -pw $pw -batch $stagingZip $remoteTarget
            Assert-ExitOk "pscp upload"
        }

        Invoke-WithRetry -Label "remote unzip" -Action {
            & plink -P $SshPort -pw $pw -batch ("{0}@{1}" -f $SshUser, $SshHost) $remoteCmd
            Assert-ExitOk "plink unzip"
        }
    } else {
        if ($hasPassword -and $null -eq $pscpCmd) {
            Write-Host "HOSTINGER_SSH_PASSWORD is set but pscp/plink not found; falling back to OpenSSH." -ForegroundColor Yellow
        }
        if ($IdentityFile) {
            Write-Host ("Auth: SSH key {0} (passphrase prompt may appear)" -f $IdentityFile) -ForegroundColor DarkGray
        } else {
            Write-Host "Auth: OpenSSH password prompt" -ForegroundColor Yellow
        }

        $scpArgs = @(
            "-P", "$SshPort",
            "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=6",
            "-o", "TCPKeepAlive=yes",
            "-o", "ConnectTimeout=30"
        )
        $sshArgs = @(
            "-p", "$SshPort",
            "-o", "ServerAliveInterval=15",
            "-o", "ServerAliveCountMax=6",
            "-o", "TCPKeepAlive=yes",
            "-o", "ConnectTimeout=30"
        )
        if ($IdentityFile) {
            $scpArgs += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
            $sshArgs += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
        }

        $scpDest = ("{0}@{1}:{2}/{3}" -f $SshUser, $SshHost, $RemotePath, $remoteZipName)
        $sshTarget = ("{0}@{1}" -f $SshUser, $SshHost)

        Invoke-WithRetry -Label "upload zip" -Action {
            & scp @scpArgs $stagingZip $scpDest
            Assert-ExitOk "scp upload"
        }

        Invoke-WithRetry -Label "remote unzip" -Action {
            & ssh @sshArgs $sshTarget $remoteCmd
            Assert-ExitOk "ssh unzip"
        }
    }

    Write-Host "Hostinger frontend deploy complete." -ForegroundColor Green
    Write-Host ""

    if (-not $SkipGitPush) {
        $dirty = git status --porcelain
        if ($dirty) {
            Write-Host "Warning: uncommitted local changes will NOT reach Railway until you commit and push." -ForegroundColor Yellow
            $dirty | ForEach-Object { Write-Host ("  {0}" -f $_) -ForegroundColor DarkYellow }
            Write-Host ""
        }

        $branch = git rev-parse --abbrev-ref HEAD
        Write-Host ("Pushing {0} to origin (Railway API auto-redeploys from GitHub)..." -f $branch) -ForegroundColor Cyan
        git push origin $branch
        if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
        Write-Host "Git push complete. Railway will rebuild the API in the background." -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Production deploy complete." -ForegroundColor Green
    Write-Host "  Frontend: https://deepskyblue-marten-415020.hostingersite.com/" -ForegroundColor Green
    $apiHost = $ApiBaseUrl -replace '/api$', ''
    Write-Host ("  API:      {0}" -f $apiHost) -ForegroundColor Green
    if (-not $SkipGitPush) {
        Write-Host "  Railway:  check Deployments tab if the API build is still running." -ForegroundColor DarkGray
    }
}
finally {
    if (Test-Path $stagingZip) {
        Remove-Item $stagingZip -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
}
