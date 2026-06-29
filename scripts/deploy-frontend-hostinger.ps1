# Build ICS frontend and upload to Hostinger via SCP.
#
# Usage:
#   .\scripts\deploy-frontend-hostinger.ps1
#   .\scripts\deploy-frontend-hostinger.ps1 -ApiBaseUrl "https://ecms-production-42be.up.railway.app/api"
#
# Auth options (first match wins):
#   1. -IdentityFile path to private key (recommended once added in Hostinger hPanel)
#   2. $env:HOSTINGER_SSH_PASSWORD for PuTTY pscp non-interactive upload
#   3. OpenSSH scp (prompts for password twice)

param(
    [string]$RemotePath = "/home/u910121167/websites/HVdBWy0pE/public_html",
    [string]$ApiBaseUrl = "https://ecms-production-42be.up.railway.app/api",
    [string]$SshUser = "u910121167_HVdBWy0pE",
    [string]$SshHost = "82.25.100.95",
    [int]$SshPort = 65002,
    [string]$IdentityFile = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"
$dist = Join-Path $frontend "dist"
$remote = "${SshUser}@${SshHost}:${RemotePath}"

if (-not $IdentityFile) {
    $defaultKey = Join-Path $env:USERPROFILE ".ssh\hostinger_ecms"
    if (Test-Path $defaultKey) { $IdentityFile = $defaultKey }
}

Write-Host "Building frontend (API: $ApiBaseUrl)..." -ForegroundColor Cyan
Push-Location $frontend
$env:VITE_API_BASE_URL = $ApiBaseUrl
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

if (-not (Test-Path $dist)) {
    Write-Error "Build output not found: $dist"
}

Write-Host ""
Write-Host "Production build contains only a few files (Vite bundles all JS into one file)." -ForegroundColor DarkGray
Get-ChildItem -Path $dist -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($dist.Length + 1)
    Write-Host "  - $rel" -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Uploading to ${SshUser}@${SshHost}:${RemotePath}" -ForegroundColor Cyan

function Invoke-ScpUpload([string[]]$ScpArgs, [string]$Target) {
    Write-Host "  -> $Target" -ForegroundColor DarkGray
    & scp @ScpArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

function Invoke-PscpUpload([string[]]$PscpArgs, [string]$Target) {
    Write-Host "  -> $Target" -ForegroundColor DarkGray
    & pscp @PscpArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$usePscp = -not $IdentityFile -and $env:HOSTINGER_SSH_PASSWORD -and (Get-Command pscp -ErrorAction SilentlyContinue)
$scpBase = @("-P", "$SshPort")
if ($IdentityFile) {
    $scpBase += @("-i", $IdentityFile, "-o", "IdentitiesOnly=yes")
}

if ($usePscp) {
    Write-Host "Using PuTTY pscp with HOSTINGER_SSH_PASSWORD." -ForegroundColor DarkGray
    $pscpBase = @("-P", "$SshPort", "-pw", $env:HOSTINGER_SSH_PASSWORD, "-batch")
    Invoke-PscpUpload ($pscpBase + @("-r", "$dist\assets", "${SshUser}@${SshHost}:${RemotePath}/")) "assets/"
    Invoke-PscpUpload ($pscpBase + @(
        "$dist\index.html",
        "$dist\ics-logo.png",
        "$dist\icons.svg",
        "$dist\logicteck-test.html",
        "$dist\.htaccess",
        "${SshUser}@${SshHost}:${RemotePath}/"
    )) "root files"
} else {
    if (-not $IdentityFile) {
        Write-Host "Enter your Hostinger SSH password when prompted (twice: assets folder + root files)." -ForegroundColor Yellow
    } else {
        Write-Host "Using SSH key: $IdentityFile" -ForegroundColor DarkGray
    }
    Write-Host ""
    Invoke-ScpUpload ($scpBase + @("-r", "$dist/assets", "${remote}/")) "assets/"
    Invoke-ScpUpload ($scpBase + @(
        "$dist/index.html",
        "$dist/ics-logo.png",
        "$dist/icons.svg",
        "$dist/logicteck-test.html",
        "$dist/.htaccess",
        "${remote}/"
    )) "root files"
}

Write-Host ""
Write-Host "Done. Open https://deepskyblue-marten-415020.hostingersite.com/" -ForegroundColor Green
Write-Host "On server, verify: ls -la ~/websites/HVdBWy0pE/public_html/assets/" -ForegroundColor DarkGray
