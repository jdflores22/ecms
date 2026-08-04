# Setup Hostinger SSH Access key + local SSH config Host alias.
# Deploy uses real SSH Access (ssh hostinger-ecms), not TCP probes.
#
# Usage:
#   .\scripts\setup-hostinger-ssh-key.ps1
#   .\scripts\setup-hostinger-ssh-key.ps1 -Force

param(
    [string]$KeyPath = (Join-Path $env:USERPROFILE ".ssh\hostinger_ecms"),
    [string]$SshUser = "u910121167_HVdBWy0pE",
    [string]$SshHost = "82.25.100.95",
    [int]$SshPort = 65002,
    [string]$SshConfigHost = "hostinger-ecms",
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$keyDir = Split-Path $KeyPath -Parent
if (-not (Test-Path $keyDir)) {
    New-Item -ItemType Directory -Path $keyDir | Out-Null
}

if ((Test-Path $KeyPath) -and -not $Force) {
    Write-Host ("Key already exists: {0}" -f $KeyPath) -ForegroundColor Yellow
    Write-Host "Re-run with -Force to replace it." -ForegroundColor Yellow
} else {
    if (Test-Path $KeyPath) {
        Copy-Item $KeyPath ("{0}.bak-{1:yyyyMMddHHmmss}" -f $KeyPath, (Get-Date))
        Remove-Item $KeyPath -Force
        Remove-Item ("{0}.pub" -f $KeyPath) -Force -ErrorAction SilentlyContinue
    }

    Write-Host "Generating new ed25519 key (empty passphrase) for SSH Access..." -ForegroundColor Cyan
    & ssh-keygen -t ed25519 -f $KeyPath -N '""' -C "ecms-hostinger-ssh-access"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

$pubPath = "{0}.pub" -f $KeyPath
$pub = (Get-Content $pubPath -Raw).Trim()

# Upsert ~/.ssh/config Host block
$configPath = Join-Path $env:USERPROFILE ".ssh\config"
$configBlock = @"
Host $SshConfigHost
    HostName $SshHost
    User $SshUser
    Port $SshPort
    IdentityFile $KeyPath
    IdentitiesOnly yes
    ServerAliveInterval 15
    ServerAliveCountMax 8
    ConnectTimeout 60
"@

if (-not (Test-Path $configPath)) {
    Set-Content -Path $configPath -Value $configBlock -Encoding ASCII
    Write-Host ("Created SSH config: {0}" -f $configPath) -ForegroundColor Green
} else {
    $existing = Get-Content $configPath -Raw
    if ($existing -match ("(?ms)^Host\s+{0}\s*$.*?(?=^Host\s|\z)" -f [regex]::Escape($SshConfigHost))) {
        $updated = [regex]::Replace(
            $existing,
            ("(?ms)^Host\s+{0}\s*$.*?(?=^Host\s|\z)" -f [regex]::Escape($SshConfigHost)),
            ($configBlock.TrimEnd() + "`r`n`r`n")
        )
        Set-Content -Path $configPath -Value $updated.TrimEnd() -Encoding ASCII
        Write-Host ("Updated SSH config Host {0}" -f $SshConfigHost) -ForegroundColor Green
    } else {
        Add-Content -Path $configPath -Value ("`r`n" + $configBlock) -Encoding ASCII
        Write-Host ("Appended SSH config Host {0}" -f $SshConfigHost) -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "==== PUBLIC KEY - paste into Hostinger SSH Access ====" -ForegroundColor Green
Write-Host $pub
Write-Host "======================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Steps:" -ForegroundColor Cyan
Write-Host "  1. hPanel -> Advanced -> SSH Access -> Enable SSH"
Write-Host "  2. SSH keys -> Add SSH Key -> paste the public key above"
Write-Host "  3. Wait ~1-2 minutes"
Write-Host "  4. Test SSH Access:"
Write-Host ("     ssh {0}" -f $SshConfigHost)
Write-Host "     (should print a shell prompt with NO password if key is installed)"
Write-Host "  5. Deploy:"
Write-Host "     .\scripts\deploy-frontend-hostinger.ps1 -SkipGitPush"
Write-Host ""
Write-Host "SSH Access details used:" -ForegroundColor DarkGray
Write-Host ("  Host/IP : {0}" -f $SshHost)
Write-Host ("  Port    : {0}" -f $SshPort)
Write-Host ("  User    : {0}" -f $SshUser)
Write-Host ("  Key     : {0}" -f $KeyPath)
Write-Host ("  Alias   : {0}" -f $SshConfigHost)
