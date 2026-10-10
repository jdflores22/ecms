# Deploy ICS frontend to Hostinger via git orphan branch (not SCP).
#
# Flow:
#   1. Build frontend/dist
#   2. Force-push contents to origin/hostinger
#   3. SSH: git fetch + reset in public_html (tiny command, no file upload)
#
# Setup (once):
#   copy deploy-config.ps1.example deploy-config.ps1
#   fill SshPassword (and GitHubToken if the repo is private)
#
# Usage:
#   .\deploy.ps1
#   .\deploy.ps1 -SkipBuild
#   .\deploy.ps1 -SkipGitPush
#   .\deploy.ps1 -UseScp          # fallback: batched SCP upload
#   .\deploy.ps1 -UsePassword

param(
    [switch]$SkipBuild,
    [switch]$SkipGitPush,
    [switch]$Full,
    [switch]$UsePassword,
    [switch]$UseScp,
    [switch]$SkipApkUpload,
    [int]$BatchMaxKb = 1200
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\scripts\deploy-common.ps1"

$config = Get-DeployConfig
$usePassword = $UsePassword.IsPresent -or -not [string]::IsNullOrWhiteSpace($config.SshPassword)

$frontend = Join-Path $PSScriptRoot 'frontend'
$dist = Join-Path $frontend 'dist'
$manifestPath = Join-Path $PSScriptRoot 'scripts\.hostinger-deploy-manifest.json'

    if (-not $SkipBuild) {
        $useProxy = $false
        if ($config.UseHostingerApiProxy -eq $true) { $useProxy = $true }
        $apiBase = if ($config.ApiBaseUrl) { $config.ApiBaseUrl } else { '/api' }
        if ($useProxy -and ($apiBase -match 'railway\.app')) {
            Write-Host 'UseHostingerApiProxy is on; building with /api (not Railway).' -ForegroundColor Yellow
            $apiBase = '/api'
        }
        if ($useProxy) {
            Write-Host 'Building frontend (API: same-origin ecms-api-proxy.php)' -ForegroundColor Cyan
        } else {
            Write-Host ("Building frontend (API: {0}, direct)" -f $apiBase) -ForegroundColor Cyan
        }
        Push-Location $frontend
        try {
            $env:VITE_USE_HOSTINGER_API_PROXY = if ($useProxy) { 'true' } else { 'false' }
            $env:VITE_API_BASE_URL = if ($useProxy) { '/api' } else { $apiBase }
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw 'npm run build failed'
        }
    }
    finally {
        Pop-Location
    }
} else {
    Write-Host 'Skipping build (using existing frontend/dist).' -ForegroundColor DarkGray
}

if (-not (Test-Path $dist)) {
    throw "Build output not found: $dist"
}

Write-Host ''

if ($UseScp) {
    Write-Host 'Using SCP fallback (batched upload)...' -ForegroundColor Yellow
    Test-DeploySsh -Config $config -UsePassword:$usePassword

    Write-Host 'Comparing local dist/ to last deploy manifest...' -ForegroundColor Cyan
    $current = Get-DistFileHashes -DistRoot $dist
    $previous = if ($Full) { @{} } else { Read-DeployManifest -Path $manifestPath }

    $toUpload = @()
    foreach ($rel in ($current.Keys | Sort-Object)) {
        if ($Full -or -not $previous.ContainsKey($rel) -or $previous[$rel] -ne $current[$rel]) {
            $toUpload += $rel
        }
    }

    Write-Host ("  Local files: {0}" -f $current.Count) -ForegroundColor DarkGray
    Write-Host ("  Upload:      {0} new/changed" -f $toUpload.Count) -ForegroundColor DarkGray

    if ($toUpload.Count -eq 0) {
        Write-Host 'Nothing to upload - Hostinger is already up to date.' -ForegroundColor Green
    } else {
        Invoke-DeployBundle -Config $config -LocalRoot $dist -RelativeFiles $toUpload -MaxBatchBytes ($BatchMaxKb * 1KB)
        Save-DeployManifest -Path $manifestPath -Map $current
        Write-Host ("Saved deploy manifest: {0}" -f $manifestPath) -ForegroundColor DarkGray
        Write-Host 'Hostinger frontend deploy complete.' -ForegroundColor Green
    }
} else {
    Publish-HostingerGitBranch -Config $config -RepoRoot $PSScriptRoot -DistRoot $dist

    Test-DeploySsh -Config $config -UsePassword:$usePassword
    Invoke-HostingerGitPull -Config $config

    if (-not $SkipApkUpload) {
        $latestApk = Join-Path $PSScriptRoot 'frontend\public\downloads\ics-trucker-latest.apk'
        if (Test-Path $latestApk) {
            Write-Host 'Uploading trucker APK(s) via SCP (avoids stale git binaries on Hostinger)...' -ForegroundColor Cyan
            & "$PSScriptRoot\scripts\publish-trucker-apks.ps1" -SkipBuild
            if ($LASTEXITCODE -ne 0) { throw 'Trucker APK SCP upload failed' }
        }
    } else {
        Write-Host 'Skipping trucker APK upload (-SkipApkUpload).' -ForegroundColor DarkGray
    }

    $current = Get-DistFileHashes -DistRoot $dist
    Save-DeployManifest -Path $manifestPath -Map $current
    Write-Host ("Saved deploy manifest: {0}" -f $manifestPath) -ForegroundColor DarkGray
    Write-Host 'Hostinger frontend deploy complete.' -ForegroundColor Green
}

Write-Host ''

if (-not $SkipGitPush) {
    $dirty = git status --porcelain
    if ($dirty) {
        Write-Host 'Warning: uncommitted local changes will NOT reach the remote API until you commit and push.' -ForegroundColor Yellow
        $dirty | ForEach-Object { Write-Host ("  {0}" -f $_) -ForegroundColor DarkYellow }
        Write-Host ''
    }

    $branch = if ($config.GitBranch) { $config.GitBranch } else { git rev-parse --abbrev-ref HEAD }
    Write-Host ("Pushing {0} to origin..." -f $branch) -ForegroundColor Cyan
    git push origin $branch
    if ($LASTEXITCODE -ne 0) {
        throw 'git push failed'
    }
    Write-Host 'Git push complete.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Production deploy complete.' -ForegroundColor Green
Write-Host ("  Frontend: {0}" -f $config.AppUrl)
if ($config.UseHostingerApiProxy -eq $true -and $config.VpsUpstream) {
    Write-Host ("  API:      {0} (browser → ecms-api-proxy.php)" -f $config.VpsUpstream) -ForegroundColor DarkGray
} elseif (-not [string]::IsNullOrWhiteSpace($config.ApiBaseUrl)) {
    Write-Host ("  API:      {0}" -f ($config.ApiBaseUrl -replace '/api$', ''))
}
Write-Host ("  Hostinger branch: origin/{0}" -f $config.HostingerGitBranch)
