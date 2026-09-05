# Creates the upload keystore for signed release APK / Google Play.
# Run once from repo root or android-trucker folder.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$keystoreDir = Join-Path $root "keystore"
$keystoreFile = Join-Path $keystoreDir "ics-trucker-upload.jks"
$localProps = Join-Path $root "local.properties"
$keyAlias = "ics-trucker"

if (-not (Test-Path $keystoreDir)) {
    New-Item -ItemType Directory -Path $keystoreDir | Out-Null
}

if (Test-Path $keystoreFile) {
    Write-Host "Keystore already exists: $keystoreFile" -ForegroundColor Yellow
    Write-Host "Delete it first if you want to create a new one."
    exit 1
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
    $studioJbr = "${env:ProgramFiles}\Android\Android Studio\jbr\bin\keytool.exe"
    if (Test-Path $studioJbr) {
        $keytool = $studioJbr
    } else {
        Write-Error "keytool not found. Install Android Studio or JDK 17+."
    }
} else {
    $keytool = $keytool.Source
}

Write-Host ""
Write-Host "ICS Trucker — release keystore setup" -ForegroundColor Cyan
Write-Host "You will be asked for a keystore password and your name/organization."
Write-Host "SAVE THESE PASSWORDS — you need them for every release and for Google Play."
Write-Host ""

& $keytool -genkeypair -v `
    -keystore $keystoreFile `
    -alias $keyAlias `
    -keyalg RSA `
    -keysize 2048 `
    -validity 10000

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

$storePathForProps = $keystoreFile.Replace("\", "\\")
$storePassword = Read-Host "Enter keystore password again (for local.properties)" -AsSecureString
$keyPasswordSecure = Read-Host "Enter key password (press Enter if same as keystore)" -AsSecureString

function ConvertFrom-SecureStringPlain([Security.SecureString]$secure) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$storePassPlain = ConvertFrom-SecureStringPlain $storePassword
$keyPassPlain = ConvertFrom-SecureStringPlain $keyPasswordSecure
if ([string]::IsNullOrWhiteSpace($keyPassPlain)) {
    $keyPassPlain = $storePassPlain
}

$releaseBlock = @"

# Release signing (do not commit)
RELEASE_STORE_FILE=$storePathForProps
RELEASE_STORE_PASSWORD=$storePassPlain
RELEASE_KEY_ALIAS=$keyAlias
RELEASE_KEY_PASSWORD=$keyPassPlain
"@

if (-not (Test-Path $localProps)) {
    Copy-Item (Join-Path $root "local.properties.example") $localProps
    Write-Host "Created local.properties from example." -ForegroundColor Green
}

$content = Get-Content $localProps -Raw
if ($content -match "RELEASE_STORE_FILE=") {
    Write-Host ""
    Write-Host "local.properties already has RELEASE_STORE_FILE. Add or update these lines manually:" -ForegroundColor Yellow
    Write-Host $releaseBlock
} else {
    Add-Content -Path $localProps -Value $releaseBlock
    Write-Host ""
    Write-Host "Added release signing entries to local.properties" -ForegroundColor Green
}

Write-Host ""
Write-Host "Keystore created: $keystoreFile" -ForegroundColor Green
Write-Host "Next: run scripts\build-release-apk.ps1" -ForegroundColor Cyan
