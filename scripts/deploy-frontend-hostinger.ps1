# Build ECMS frontend and upload to Hostinger via SCP (password auth).
# Uses: ssh -p 65002 u910121167_HVdBWy0pE@82.25.100.95
#
# Usage:
#   .\scripts\deploy-frontend-hostinger.ps1

param(
    [string]$RemotePath = "/home/u910121167/websites/HVdBWy0pE/public_html",
    [string]$ApiBaseUrl = "/api",
    [string]$SshUser = "u910121167_HVdBWy0pE",
    [string]$SshHost = "82.25.100.95",
    [int]$SshPort = 65002
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$frontend = Join-Path $root "frontend"
$dist = Join-Path $frontend "dist"
$remote = "${SshUser}@${SshHost}:${RemotePath}"

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
Write-Host "Enter your Hostinger SSH password when prompted (twice: assets folder + root files)." -ForegroundColor Yellow
Write-Host ""

# Upload assets/ folder first (index.html loads /assets/index-*.js)
& scp -P $SshPort -r "$dist/assets" "${remote}/"
if ($LASTEXITCODE -ne 0) { exit 1 }

# Root files + hidden .htaccess
& scp -P $SshPort `
    "$dist/index.html" `
    "$dist/favicon.svg" `
    "$dist/icons.svg" `
    "$dist/.htaccess" `
    "${remote}/"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Done. Open https://deepskyblue-marten-415020.hostingersite.com/" -ForegroundColor Green
Write-Host "On server, verify: ls -la ~/websites/HVdBWy0pE/public_html/assets/" -ForegroundColor DarkGray
