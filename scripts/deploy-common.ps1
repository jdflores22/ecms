# Shared Hostinger SSH deploy helpers (same pattern as online-betting).
# Sourced by deploy.ps1 / scripts that call Get-DeployConfig.

function Get-DeployConfig {
    $configPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'deploy-config.ps1'
    if (-not (Test-Path $configPath)) {
        throw "Missing deploy-config.ps1. Copy deploy-config.ps1.example to deploy-config.ps1 first."
    }

    $config = & $configPath
    if ($null -eq $config -or $config -isnot [hashtable]) {
        throw "deploy-config.ps1 must output a hashtable."
    }

    if ([string]::IsNullOrWhiteSpace($config.SshKey)) {
        $config.SshKey = Join-Path $env:USERPROFILE '.ssh\hostinger_ecms'
    }

    if ([string]::IsNullOrWhiteSpace($config.ApiBaseUrl)) {
        $config.ApiBaseUrl = 'https://ecms-production-42be.up.railway.app/api'
    }

    if ([string]::IsNullOrWhiteSpace($config.AppUrl)) {
        $config.AppUrl = 'https://deepskyblue-marten-415020.hostingersite.com'
    }

    if ([string]::IsNullOrWhiteSpace($config.HostingerGitBranch)) {
        $config.HostingerGitBranch = 'hostinger'
    }

    if ([string]::IsNullOrWhiteSpace($config.GitHubRepo)) {
        $config.GitHubRepo = 'jdflores22/ecms'
    }

    return $config
}

function Get-HostingerGitRemoteUrl {
    param([hashtable]$Config)

    $repo = $Config.GitHubRepo
    $token = $Config.GitHubToken
    if ([string]::IsNullOrWhiteSpace($token)) {
        $token = $env:ECMS_GITHUB_TOKEN
    }
    if ([string]::IsNullOrWhiteSpace($token)) {
        $token = $env:GITHUB_TOKEN
    }

    if (-not [string]::IsNullOrWhiteSpace($token)) {
        return "https://x-access-token:$token@github.com/$repo.git"
    }

    return "https://github.com/$repo.git"
}

function Get-DeployHostKeyArg {
    param([hashtable]$Config)

    if ($Config.SshHostKey) {
        return @('-hostkey', $Config.SshHostKey)
    }

    return @()
}

function Initialize-DeployAuth {
    param(
        [hashtable]$Config,
        [switch]$UsePassword
    )

    if ($UsePassword -or -not [string]::IsNullOrWhiteSpace($Config.SshPassword)) {
        $script:DeployAuthMode = 'password'
        if (-not $script:DeploySshPassword) {
            if (-not [string]::IsNullOrWhiteSpace($Config.SshPassword)) {
                $script:DeploySshPassword = $Config.SshPassword
            } elseif ($env:DEPLOY_SSH_PASSWORD) {
                $script:DeploySshPassword = $env:DEPLOY_SSH_PASSWORD
            } elseif ($env:HOSTINGER_SSH_PASSWORD) {
                $script:DeploySshPassword = $env:HOSTINGER_SSH_PASSWORD
            } else {
                $secure = Read-Host "Enter SSH password for $($Config.SshUser)@$($Config.SshHost)" -AsSecureString
                $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
                $script:DeploySshPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
                [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
            }
        }
        return
    }

    if (-not (Test-Path $Config.SshKey)) {
        throw "SSH private key not found: $($Config.SshKey). Use password in deploy-config.ps1 or -UsePassword."
    }

    $target = "$($Config.SshUser)@$($Config.SshHost)"
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & ssh.exe -p $Config.SshPort -i $Config.SshKey `
        -o StrictHostKeyChecking=accept-new `
        -o BatchMode=yes `
        -o IdentitiesOnly=yes `
        -o ConnectTimeout=30 `
        -o ServerAliveInterval=15 `
        $target "echo connected" 2>$null
    $sshExit = $LASTEXITCODE
    $ErrorActionPreference = $prevEap

    if ($sshExit -eq 0) {
        $script:DeployAuthMode = 'key'
        return
    }

    Write-Host "SSH key login failed. Falling back to password auth for this deploy." -ForegroundColor Yellow
    Initialize-DeployAuth -Config $Config -UsePassword
}

function Invoke-DeployRemote {
    param(
        [hashtable]$Config,
        [string]$Command,
        [int]$MaxAttempts = 4
    )

    $Command = ($Command -replace "`r`n", "`n" -replace "`r", "").Trim()
    $target = "$($Config.SshUser)@$($Config.SshHost)"
    $attempt = 0
    $delays = @(0, 3, 8, 15)

    while ($attempt -lt $MaxAttempts) {
        $attempt++
        if ($attempt -gt 1) {
            $wait = $delays[[Math]::Min($attempt - 1, $delays.Length - 1)]
            Write-Host "Remote command retry $attempt/$MaxAttempts in ${wait}s ..." -ForegroundColor Yellow
            Start-Sleep -Seconds $wait
        }

        if ($script:DeployAuthMode -eq 'password') {
            $plink = Get-Command plink.exe -ErrorAction Stop
            $args = @('-batch', '-P', $Config.SshPort, '-pw', $script:DeploySshPassword) + (Get-DeployHostKeyArg -Config $Config) + @($target, $Command)
            & $plink.Source @args
        } elseif (Get-Command ssh.exe -ErrorAction SilentlyContinue) {
            $sshArgs = @(
                '-p', $Config.SshPort,
                '-i', $Config.SshKey,
                '-o', 'StrictHostKeyChecking=accept-new',
                '-o', 'BatchMode=yes',
                '-o', 'IdentitiesOnly=yes',
                '-o', 'ConnectTimeout=30',
                '-o', 'ServerAliveInterval=15',
                '-o', 'Compression=yes',
                $target,
                $Command
            )
            & ssh.exe @sshArgs
        } else {
            $plink = Get-Command plink.exe -ErrorAction Stop
            $args = @('-batch', '-P', $Config.SshPort, '-i', $Config.SshKey) + (Get-DeployHostKeyArg -Config $Config) + @($target, $Command)
            & $plink.Source @args
        }

        if ($LASTEXITCODE -eq 0) {
            return
        }
    }

    throw "Remote command failed after $MaxAttempts attempts: $Command"
}

function Invoke-DeployEnsureRemoteDir {
    param(
        [hashtable]$Config,
        [string]$RemoteTarget
    )

    $remoteTarget = ($RemoteTarget -replace '\\', '/').Trim('/')
    if ($remoteTarget -eq '') {
        return
    }

    $remoteDir = ($remoteTarget -replace '/[^/]+$', '').Trim('/')
    if ($remoteDir -eq '') {
        return
    }

    $remoteRoot = $Config.RemotePath.TrimEnd('/')
    Invoke-DeployRemote -Config $Config -Command "mkdir -p '$remoteRoot/$remoteDir'"
}

function Invoke-DeployCopy {
    param(
        [hashtable]$Config,
        [switch]$Recursive,
        [string]$LocalPath,
        [string]$RemoteTarget,
        [int]$MaxAttempts = 5
    )

    if (-not (Test-Path $LocalPath)) {
        throw "Local file not found: $LocalPath"
    }

    if (-not $Recursive) {
        Invoke-DeployEnsureRemoteDir -Config $Config -RemoteTarget $RemoteTarget
    }

    $remote = "$($Config.SshUser)@$($Config.SshHost):$($Config.RemotePath.TrimEnd('/'))/$RemoteTarget"
    $attempt = 0
    $delays = @(0, 4, 8, 15, 25)
    $sizeKb = [math]::Round((Get-Item $LocalPath).Length / 1KB, 1)

    while ($attempt -lt $MaxAttempts) {
        $attempt++
        if ($attempt -gt 1) {
            $wait = $delays[[Math]::Min($attempt - 1, $delays.Length - 1)]
            Write-Host "  retry $attempt/$MaxAttempts in ${wait}s ..." -ForegroundColor Yellow
            Start-Sleep -Seconds $wait
        }

        if ($script:DeployAuthMode -eq 'password') {
            $pscp = Get-Command pscp.exe -ErrorAction Stop
            $args = @('-batch', '-P', $Config.SshPort, '-pw', $script:DeploySshPassword) + (Get-DeployHostKeyArg -Config $Config)
            if ($Recursive) { $args += '-r' }
            & $pscp.Source @args $LocalPath $remote
        } elseif (Get-Command scp.exe -ErrorAction SilentlyContinue) {
            $args = @(
                '-P', $Config.SshPort,
                '-i', $Config.SshKey,
                '-o', 'StrictHostKeyChecking=accept-new',
                '-o', 'BatchMode=yes',
                '-o', 'IdentitiesOnly=yes',
                '-o', 'ConnectTimeout=30',
                '-o', 'Compression=yes'
            )
            if ($Recursive) { $args += '-r' }
            & scp.exe @args $LocalPath $remote
        } else {
            $pscp = Get-Command pscp.exe -ErrorAction Stop
            $args = @('-batch', '-P', $Config.SshPort, '-i', $Config.SshKey) + (Get-DeployHostKeyArg -Config $Config)
            if ($Recursive) { $args += '-r' }
            & $pscp.Source @args $LocalPath $remote
        }

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  uploaded ($sizeKb KB)" -ForegroundColor DarkGray
            return
        }
    }

    throw "Copy failed after $MaxAttempts attempts: $LocalPath"
}

function Split-DeployFileBatches {
    param(
        [string]$LocalRoot,
        [string[]]$RelativeFiles,
        [int]$MaxBatchBytes = 1200000
    )

    $batches = New-Object System.Collections.Generic.List[object]
    $current = New-Object System.Collections.Generic.List[string]
    $currentBytes = [int64]0

    foreach ($rel in ($RelativeFiles | Sort-Object)) {
        $localPath = Join-Path $LocalRoot ($rel -replace '/', '\')
        if (-not (Test-Path $localPath)) {
            throw "Missing local file for bundle: $localPath"
        }
        $size = [int64](Get-Item $localPath).Length

        if ($current.Count -gt 0 -and ($currentBytes + $size) -gt $MaxBatchBytes) {
            $batches.Add(@($current.ToArray()))
            $current = New-Object System.Collections.Generic.List[string]
            $currentBytes = [int64]0
        }

        $current.Add($rel)
        $currentBytes += $size

        if ($currentBytes -ge $MaxBatchBytes) {
            $batches.Add(@($current.ToArray()))
            $current = New-Object System.Collections.Generic.List[string]
            $currentBytes = [int64]0
        }
    }

    if ($current.Count -gt 0) {
        $batches.Add(@($current.ToArray()))
    }

    return $batches
}

function Invoke-DeployBundle {
    param(
        [hashtable]$Config,
        [string]$LocalRoot,
        [string[]]$RelativeFiles,
        [int]$MaxAttempts = 5,
        [int]$MaxBatchBytes = 1200000,
        [int]$PauseSeconds = 2
    )

    if ($RelativeFiles.Count -eq 0) {
        return
    }

    if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) {
        throw 'tar.exe not found. Use Windows 10+.'
    }

    $batches = Split-DeployFileBatches -LocalRoot $LocalRoot -RelativeFiles $RelativeFiles -MaxBatchBytes $MaxBatchBytes
    Write-Host ("Uploading {0} file(s) in {1} batch(es) (~{2} KB max each)..." -f $RelativeFiles.Count, $batches.Count, [math]::Round($MaxBatchBytes / 1KB)) -ForegroundColor Cyan

    for ($i = 0; $i -lt $batches.Count; $i++) {
        $batch = @($batches[$i])
        $batchNo = $i + 1
        $staging = Join-Path $env:TEMP ("ecms-deploy-bundle-" + [Guid]::NewGuid().ToString('N'))
        $archive = Join-Path $env:TEMP ("ecms-deploy-bundle-" + [Guid]::NewGuid().ToString('N') + '.tar.gz')
        New-Item -ItemType Directory -Path $staging -Force | Out-Null

        try {
            foreach ($rel in $batch) {
                $localPath = Join-Path $LocalRoot ($rel -replace '/', '\')
                $dest = Join-Path $staging ($rel -replace '/', '\')
                $destDir = Split-Path $dest -Parent
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                Copy-Item $localPath $dest -Force
            }

            Write-Host ("  Batch {0}/{1}: {2} file(s) ..." -f $batchNo, $batches.Count, $batch.Count) -ForegroundColor Cyan
            & tar.exe -czf $archive -C $staging .
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create archive for batch $batchNo"
            }

            $archiveKb = [math]::Round((Get-Item $archive).Length / 1KB, 1)
            Write-Host ("    Bundle size: {0} KB" -f $archiveKb) -ForegroundColor DarkGray

            $remoteArchiveName = 'ecms-deploy-batch-' + $batchNo + '-' + [Guid]::NewGuid().ToString('N') + '.tar.gz'
            Invoke-DeployCopy -Config $Config -LocalPath $archive -RemoteTarget $remoteArchiveName -MaxAttempts $MaxAttempts

            $remoteRoot = $Config.RemotePath.TrimEnd('/')
            $extractCmd = "cd '$remoteRoot' && tar -xzf '$remoteRoot/$remoteArchiveName' && rm -f '$remoteRoot/$remoteArchiveName' && echo BATCH_${batchNo}_OK"
            Invoke-DeployRemote -Config $Config -Command $extractCmd -MaxAttempts $MaxAttempts
            Write-Host ("    Batch {0} OK" -f $batchNo) -ForegroundColor Green
        }
        finally {
            if (Test-Path $staging) {
                Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
            }
            if (Test-Path $archive) {
                Remove-Item $archive -Force -ErrorAction SilentlyContinue
            }
        }

        if ($i -lt ($batches.Count - 1) -and $PauseSeconds -gt 0) {
            Start-Sleep -Seconds $PauseSeconds
        }
    }

    Write-Host 'All batches extracted on server.' -ForegroundColor Green
}

function Test-DeploySsh {
    param(
        [hashtable]$Config,
        [switch]$UsePassword
    )

    Write-Host "Testing SSH Access to $($Config.SshUser)@$($Config.SshHost):$($Config.SshPort) ..."
    $usePassword = $UsePassword.IsPresent -or -not [string]::IsNullOrWhiteSpace($Config.SshPassword)
    Initialize-DeployAuth -Config $Config -UsePassword:$usePassword
    Invoke-DeployRemote -Config $Config -Command "echo SSH_ACCESS_OK && pwd"
    Write-Host "SSH Access OK." -ForegroundColor Green
}

function Publish-HostingerGitBranch {
    param(
        [hashtable]$Config,
        [string]$RepoRoot,
        [string]$DistRoot
    )

    if (-not (Test-Path (Join-Path $DistRoot 'index.html'))) {
        throw "Build output missing index.html: $DistRoot"
    }

    $branch = $Config.HostingerGitBranch
    $staging = Join-Path $env:TEMP ("ecms-hostinger-git-" + [Guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $staging -Force | Out-Null

    $originUrl = (& git -C $RepoRoot remote get-url origin).Trim()
    if ([string]::IsNullOrWhiteSpace($originUrl)) {
        throw 'git remote origin is not set'
    }

    Write-Host ("Publishing frontend/dist to orphan branch '{0}' ..." -f $branch) -ForegroundColor Cyan

    try {
        Push-Location $staging
        try {
            git init -q
            if ($LASTEXITCODE -ne 0) { throw 'git init failed in staging dir' }

            git checkout -q -b $branch
            if ($LASTEXITCODE -ne 0) { throw "git checkout -b $branch failed" }

            Copy-Item -Path (Join-Path $DistRoot '*') -Destination $staging -Recurse -Force

            # Keep Hostinger from treating this as a Jekyll site if ever served via Pages-like tooling
            if (-not (Test-Path (Join-Path $staging '.nojekyll'))) {
                New-Item -ItemType File -Path (Join-Path $staging '.nojekyll') -Force | Out-Null
            }

            git add -A
            if ($LASTEXITCODE -ne 0) { throw 'git add failed' }

            $status = git status --porcelain
            if (-not $status) {
                Write-Host '  Staging tree empty after copy - nothing to publish.' -ForegroundColor Yellow
                return
            }

            $msg = "Deploy frontend $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git -c user.name='ECMS Deploy' -c user.email='deploy@ecms.local' commit -q -m $msg
            if ($LASTEXITCODE -ne 0) { throw 'git commit failed' }

            git remote add origin $originUrl
            if ($LASTEXITCODE -ne 0) { throw 'git remote add failed' }

            Write-Host ("  Force-pushing to origin/{0} ..." -f $branch) -ForegroundColor DarkGray
            git push -f origin "HEAD:$branch"
            if ($LASTEXITCODE -ne 0) {
                throw "git push -f origin HEAD:$branch failed"
            }

            Write-Host ("  Published origin/{0}" -f $branch) -ForegroundColor Green
        }
        finally {
            Pop-Location
        }
    }
    finally {
        if (Test-Path $staging) {
            Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Invoke-HostingerGitPull {
    param(
        [hashtable]$Config,
        [int]$MaxAttempts = 5
    )

    $branch = $Config.HostingerGitBranch
    $remoteRoot = $Config.RemotePath.TrimEnd('/')
    $fetchUrl = Get-HostingerGitRemoteUrl -Config $Config

    $safeUrl = $fetchUrl.Replace("'", "'\''")
    $safeRoot = $remoteRoot.Replace("'", "'\''")
    $safeBranch = $branch.Replace("'", "'\''")

    Write-Host ("Pulling origin/{0} on Hostinger (no file upload) ..." -f $branch) -ForegroundColor Cyan

    # One-time init if needed, then fetch + hard reset. Single-line for plink compatibility.
    $cmd = "cd '$safeRoot' && (test -d .git || (git init && git remote add origin '$safeUrl')) && git remote set-url origin '$safeUrl' && git fetch origin '$safeBranch' && git checkout -f -B '$safeBranch' origin/$safeBranch && git clean -fd && test -f index.html && echo DEPLOY_OK"

    Invoke-DeployRemote -Config $Config -Command $cmd -MaxAttempts $MaxAttempts
    Write-Host 'Hostinger git pull complete.' -ForegroundColor Green
}

function Get-DistFileHashes {
    param([string]$DistRoot)

    $map = @{}
    Get-ChildItem -Path $DistRoot -Recurse -File | ForEach-Object {
        $rel = $_.FullName.Substring($DistRoot.Length).TrimStart('\', '/').Replace('\', '/')
        $map[$rel] = (Get-FileHash -Algorithm SHA256 -Path $_.FullName).Hash.ToLowerInvariant()
    }
    return $map
}

function Read-DeployManifest {
    param([string]$Path)

    if (-not (Test-Path $Path)) { return @{} }
    try {
        $json = Get-Content -Path $Path -Raw -Encoding UTF8 | ConvertFrom-Json
        $map = @{}
        $json.PSObject.Properties | ForEach-Object { $map[$_.Name] = [string]$_.Value }
        return $map
    } catch {
        return @{}
    }
}

function Save-DeployManifest {
    param(
        [string]$Path,
        [hashtable]$Map
    )

    $ordered = [ordered]@{}
    $Map.Keys | Sort-Object | ForEach-Object { $ordered[$_] = $Map[$_] }
    ($ordered | ConvertTo-Json -Depth 5) | Set-Content -Path $Path -Encoding UTF8
}
