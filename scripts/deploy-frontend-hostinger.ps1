# Back-compat wrapper. Prefer: .\deploy.ps1
param(
    [switch]$SkipBuild,
    [switch]$SkipGitPush,
    [switch]$FullSync,
    [switch]$UsePassword
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$argsList = @()
if ($SkipBuild) { $argsList += '-SkipBuild' }
if ($SkipGitPush) { $argsList += '-SkipGitPush' }
if ($FullSync) { $argsList += '-Full' }
if ($UsePassword) { $argsList += '-UsePassword' }

& (Join-Path $root 'deploy.ps1') @argsList
exit $LASTEXITCODE
