# Builds a signed release APK for sideload distribution to truckers.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$localProps = Join-Path $root "local.properties"
$gradlew = Join-Path $root "gradlew.bat"

if (-not (Test-Path $localProps)) {
    Write-Error "Missing local.properties. Copy local.properties.example and set API_BASE_URL."
}

if (-not (Test-Path $gradlew)) {
    Write-Error "gradlew.bat not found under $root"
}

$props = @{}
Get-Content $localProps | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
        $props[$matches[1].Trim()] = $matches[2].Trim()
    }
}

$storeFile = $props["RELEASE_STORE_FILE"]
if ([string]::IsNullOrWhiteSpace($storeFile) -or -not (Test-Path $storeFile)) {
    Write-Host "Release keystore not configured." -ForegroundColor Yellow
    Write-Host "Run first:  scripts\create-release-keystore.ps1" -ForegroundColor Cyan
    exit 1
}

Push-Location $root
try {
    Write-Host "Building signed release APK..." -ForegroundColor Cyan
    & $gradlew assembleRelease --no-daemon
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $apk = Join-Path $root "app\build\outputs\apk\release\app-release.apk"
    if (-not (Test-Path $apk)) {
        Write-Error "Expected APK not found: $apk"
    }

    $buildGradle = Get-Content (Join-Path $root "app\build.gradle.kts") -Raw
    $versionName = if ($buildGradle -match 'versionName\s*=\s*"([^"]+)"') { $matches[1] } else { "release" }

    $dist = Join-Path $root "dist"
    if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist | Out-Null }

    $outName = "ICS-Trucker-v$versionName-release.apk"
    $outPath = Join-Path $dist $outName
    Copy-Item $apk $outPath -Force

    $repoRoot = Split-Path -Parent $root
    $webDownloads = Join-Path $repoRoot "frontend\public\downloads"
    if (-not (Test-Path $webDownloads)) { New-Item -ItemType Directory -Path $webDownloads | Out-Null }
    $latestWeb = Join-Path $webDownloads "ics-trucker-latest.apk"
    $versionedWeb = Join-Path $webDownloads $outName
    Copy-Item $apk $latestWeb -Force
    Copy-Item $apk $versionedWeb -Force

    $sizeMb = [math]::Round((Get-Item $outPath).Length / 1MB, 1)
    Write-Host ""
    Write-Host "Release APK ready:" -ForegroundColor Green
    Write-Host "  $outPath"
    Write-Host "  $latestWeb"
    Write-Host "  Size: $sizeMb MB"
    Write-Host ""
    Write-Host "Web download page: /download/trucker-app"
    Write-Host "Direct APK URL:      /downloads/ics-trucker-latest.apk"
    Write-Host ""
    Write-Host "Next: cd ..\frontend && npm run build  then upload dist/ to Hostinger."
} finally {
    Pop-Location
}
