# Build ECMS API and upload to Hostinger VPS.
#
# Usage:
#   .\scripts\deploy-api-vps.ps1 -VpsHost 203.0.113.10 -VpsUser ecms
#   .\scripts\deploy-api-vps.ps1 -VpsHost api.yourdomain.com -VpsUser ecms -RestartService

param(
    [Parameter(Mandatory = $true)]
    [string]$VpsHost,

    [string]$VpsUser = "ecms",
    [int]$SshPort = 22,
    [string]$RemotePath = "/var/www/ecms/api",
    [switch]$RestartService
)

$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent
$publishDir = Join-Path $root "publish\api"
$remote = "${VpsUser}@${VpsHost}:${RemotePath}/"

Write-Host "Publishing ECMS API (Release)..." -ForegroundColor Cyan
Push-Location $root
dotnet publish backend\ECMS.API\ECMS.API.csproj -c Release -o $publishDir
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "Uploading to $remote" -ForegroundColor Cyan
Write-Host "Enter VPS SSH password when prompted." -ForegroundColor Yellow
& scp -P $SshPort -r "$publishDir\*" $remote
if ($LASTEXITCODE -ne 0) { exit 1 }

if ($RestartService) {
    Write-Host "Restarting ecms-api on VPS..." -ForegroundColor Cyan
    & ssh -p $SshPort "${VpsUser}@${VpsHost}" "sudo systemctl restart ecms-api && sudo systemctl status ecms-api --no-pager"
}

Write-Host ""
Write-Host "Done. API files uploaded to $RemotePath" -ForegroundColor Green
Write-Host "Ensure appsettings.Production.json exists on the VPS (not overwritten by publish)." -ForegroundColor DarkGray
Write-Host "Restart manually: ssh ${VpsUser}@${VpsHost} 'sudo systemctl restart ecms-api'" -ForegroundColor DarkGray
