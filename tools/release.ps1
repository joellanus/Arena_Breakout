Param(
    [string]$VersionOverride
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Split-Path -Parent $ScriptDir
$Dist = Join-Path $Root 'dist'
$ConfigPath = Join-Path $Root 'config.js'
$ManifestPath = Join-Path $Root 'version.json'

# Ensure dist exists fresh
if (Test-Path $Dist) { Remove-Item -Recurse -Force $Dist }
New-Item -ItemType Directory -Force -Path $Dist | Out-Null

# Extract version from config.js unless overridden
$Version = $null
if ($VersionOverride) {
    $Version = $VersionOverride
} else {
    if (-not (Test-Path $ConfigPath)) { throw "config.js not found at $ConfigPath" }
    $configContent = Get-Content -Raw -Path $ConfigPath
    $match = [regex]::Match($configContent, 'version\s*:\s*"([^"]+)"')
    if (-not $match.Success) { throw 'Failed to parse version from config.js' }
    $Version = $match.Groups[1].Value
}

# Output archives
$NameBase = "arena-breakout-helper-v$Version"
$ZipPathVersioned = Join-Path $Dist ("$NameBase.zip")
$ZipPathLatest = Join-Path $Dist 'latest.zip'

# Gather files to include, excluding unwanted folders/files
$excludePatterns = @(
    '\\.git(\\|$)',
    '\\dist(\\|$)',
    '\\tools(\\|$)',
    '\\.cursor(\\|$)',
    '\\.agent-tools(\\|$)'
)

$files = Get-ChildItem -Path $Root -Recurse -File |
    Where-Object {
        $full = $_.FullName
        -not ($excludePatterns | ForEach-Object { $full -match $_ } | Where-Object { $_ })
    } |
    Select-Object -ExpandProperty FullName

if (-not $files) { throw 'No files found to include in the archive.' }

# Create zip
if (Test-Path $ZipPathVersioned) { Remove-Item -Force $ZipPathVersioned }
Compress-Archive -Path $files -DestinationPath $ZipPathVersioned -CompressionLevel Optimal

# Copy/overwrite latest.zip alias
Copy-Item -Force $ZipPathVersioned $ZipPathLatest

# Update manifest JSON at repo root
$manifest = [ordered]@{
    version   = $Version
    notes     = "Automated build"
    timestamp = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
}
$manifest | ConvertTo-Json | Set-Content -Encoding UTF8 -Path $ManifestPath

Write-Host "Built: $ZipPathVersioned"
Write-Host "Alias: $ZipPathLatest"
Write-Host "Manifest updated: $ManifestPath"

Write-Host ''
Write-Host 'Next steps:'
Write-Host '1) Commit and push changes.'
Write-Host '2) Create a GitHub Release and upload dist/latest.zip as asset named: arena-breakout-helper.zip'
Write-Host '3) Ensure config.js update URLs point to:'
Write-Host '   - manifestUrl: https://raw.githubusercontent.com/OWNER/REPO/main/version.json'
Write-Host '   - zipUrl:      https://github.com/OWNER/REPO/releases/latest/download/arena-breakout-helper.zip'
