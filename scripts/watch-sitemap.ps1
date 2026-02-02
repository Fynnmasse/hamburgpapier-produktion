param(
  [string]$ConfigPath = "sitemap.config.json"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cfgPath = if ([System.IO.Path]::IsPathRooted($ConfigPath)) { $ConfigPath } else { Join-Path $repoRoot $ConfigPath }
$genScript = Join-Path $PSScriptRoot "generate-sitemap.ps1"
$script:configPathArg = $ConfigPath

if (-not (Test-Path $cfgPath)) {
  throw "Config not found: $cfgPath"
}
if (-not (Test-Path $genScript)) {
  throw "Generator not found: $genScript"
}

$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$excludeDirs = @()
if ($cfg.excludeDirs) {
  $excludeDirs = @($cfg.excludeDirs)
}

$contentExtensions = @(
  ".html", ".css", ".js", ".json",
  ".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg",
  ".mp4", ".mov", ".m4v", ".webm",
  ".woff", ".woff2", ".ttf", ".otf", ".pdf"
)

function Test-IsExcludedPath([string]$fullPath) {
  foreach ($dir in $excludeDirs) {
    if ([string]::IsNullOrWhiteSpace($dir)) { continue }
    if ($fullPath -like "*\\$dir\\*" -or $fullPath -like "*/$dir/*") { return $true }
  }
  return $false
}

function Should-ProcessEvent([string]$fullPath) {
  if ([string]::IsNullOrWhiteSpace($fullPath)) { return $false }
  if (Test-IsExcludedPath $fullPath) { return $false }

  $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
  if ($contentExtensions -contains $ext) { return $true }

  return $false
}

$script:pending = $false
$script:lastEvent = Get-Date
$script:cooldownMs = 600

$timer = New-Object System.Timers.Timer
$timer.Interval = 300
$timer.AutoReset = $true
$timer.add_Elapsed({
  if ($script:pending -and ((Get-Date) - $script:lastEvent).TotalMilliseconds -ge $script:cooldownMs) {
    $script:pending = $false
    & $genScript -ConfigPath $script:configPathArg | Out-Null
  }
})

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $repoRoot.Path
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]'LastWrite, FileName, DirectoryName, Size'

$action = {
  $path = $Event.SourceEventArgs.FullPath
  if (Should-ProcessEvent $path) {
    $script:pending = $true
    $script:lastEvent = Get-Date
  }
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

$watcher.EnableRaisingEvents = $true
$timer.Start()

& $genScript -ConfigPath $script:configPathArg | Out-Null

Write-Host "Watching for changes. Press Ctrl+C to stop." 
while ($true) { Start-Sleep -Seconds 1 }
