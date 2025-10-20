Param(
    [Parameter(Mandatory=$true)][string]$Version,
    [string]$Changelog=""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$ConfigPath = Join-Path $Root 'config.js'
$ChangelogPath = Join-Path $Root 'CHANGELOG.md'

if (-not (Test-Path $ConfigPath)) { throw "config.js not found at $ConfigPath" }

# Update version in config.js (simple replace on version: "...")
$content = Get-Content -Raw -Path $ConfigPath
$new = [regex]::Replace($content, 'version\s*:\s*"([^"]+)"', "version: \"$Version\"")
if ($new -ne $content) { Set-Content -Path $ConfigPath -Value $new -Encoding UTF8 }

# Prepend CHANGELOG stub if provided
if ($Changelog -and (Test-Path $ChangelogPath)) {
    $existing = Get-Content -Raw -Path $ChangelogPath
    $entry = "`n## $Version`n- $Changelog`n"
    Set-Content -Path $ChangelogPath -Value ($existing + $entry) -Encoding UTF8
}

& (Join-Path $Root 'tools' 'release.ps1') -VersionOverride $Version

Write-Host "Bumped to $Version. Next:" -ForegroundColor Green
Write-Host "  git add -A" -ForegroundColor Yellow
Write-Host "  git commit -m \"v$Version: $Changelog\"" -ForegroundColor Yellow
Write-Host "  git push" -ForegroundColor Yellow
