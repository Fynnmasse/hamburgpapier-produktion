param(
  [string]$ConfigPath = "sitemap.config.json"
)

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$cfgPath = if ([System.IO.Path]::IsPathRooted($ConfigPath)) { $ConfigPath } else { Join-Path $repoRoot $ConfigPath }

if (-not (Test-Path $cfgPath)) {
  throw "Config not found: $cfgPath"
}

$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$baseUrl = [string]$cfg.baseUrl
if ([string]::IsNullOrWhiteSpace($baseUrl)) {
  throw "baseUrl missing in $cfgPath"
}
$baseUrl = $baseUrl.TrimEnd('/')

$excludeDirs = @()
if ($cfg.excludeDirs) {
  $excludeDirs = @($cfg.excludeDirs)
}

function Test-IsExcludedPath([string]$fullPath) {
  foreach ($dir in $excludeDirs) {
    if ([string]::IsNullOrWhiteSpace($dir)) { continue }
    if ($fullPath -like "*\\$dir\\*" -or $fullPath -like "*/$dir/*") { return $true }
  }
  return $false
}

$include = @()
if ($cfg.include) {
  $include = @($cfg.include)
}

if ($include.Count -gt 0) {
  $htmlFiles = foreach ($rel in $include) {
    $p = Join-Path $repoRoot $rel
    if (Test-Path $p) { Get-Item -Path $p }
  }
} else {
  $htmlFiles = Get-ChildItem -Path $repoRoot -Recurse -Filter *.html -File |
    Where-Object { -not (Test-IsExcludedPath $_.FullName) }
}

if (-not $htmlFiles -or $htmlFiles.Count -eq 0) {
  throw "No HTML files found for sitemap."
}

$lastmodStrategy = [string]$cfg.lastmodStrategy
$siteLastModUtc = $null
if ($lastmodStrategy -eq "site") {
  $contentExtensions = @(
    ".html", ".css", ".js", ".json",
    ".png", ".jpg", ".jpeg", ".webp", ".avif", ".svg",
    ".mp4", ".mov", ".m4v", ".webm",
    ".woff", ".woff2", ".ttf", ".otf", ".pdf"
  )

  $contentFiles = Get-ChildItem -Path $repoRoot -Recurse -File |
    Where-Object {
      -not (Test-IsExcludedPath $_.FullName) -and
      $contentExtensions -contains $_.Extension.ToLower()
    }

  if ($contentFiles -and $contentFiles.Count -gt 0) {
    $siteLastModUtc = ($contentFiles | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1).LastWriteTimeUtc
  } else {
    $siteLastModUtc = (Get-Date).ToUniversalTime()
  }
}

function Format-LastMod([datetime]$dt) {
  return $dt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
}

function Build-Loc([string]$relativePath) {
  $rel = $relativePath -replace "\\", "/"
  if ($rel.ToLower().EndsWith("index.html")) {
    $dir = $rel.Substring(0, $rel.Length - "index.html".Length)
    if ([string]::IsNullOrEmpty($dir)) {
      $loc = "$baseUrl/"
    } else {
      $loc = "$baseUrl/$dir"
      if (-not $loc.EndsWith("/")) { $loc += "/" }
    }
  } else {
    $loc = "$baseUrl/$rel"
  }
  return ($loc -replace "(?<!:)/{2,}", "/")
}

$settings = New-Object System.Xml.XmlWriterSettings
$settings.Indent = $true
$settings.Encoding = [System.Text.UTF8Encoding]::new($false)
$settings.OmitXmlDeclaration = $false

$outPath = Join-Path $repoRoot "sitemap.xml"
$writer = [System.Xml.XmlWriter]::Create($outPath, $settings)

$writer.WriteStartDocument()
$writer.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9")

foreach ($file in ($htmlFiles | Sort-Object FullName)) {
  $relative = $file.FullName.Substring($repoRoot.Path.Length).TrimStart([char[]]@('\','/'))
  $loc = Build-Loc $relative

  if ($lastmodStrategy -eq "site" -and $siteLastModUtc) {
    $lastmod = Format-LastMod $siteLastModUtc
  } else {
    $lastmod = Format-LastMod $file.LastWriteTimeUtc
  }

  $writer.WriteStartElement("url")
  $writer.WriteElementString("loc", $loc)
  $writer.WriteElementString("lastmod", $lastmod)
  $writer.WriteEndElement()
}

$writer.WriteEndElement()
$writer.WriteEndDocument()
$writer.Flush()
$writer.Close()

Write-Host "sitemap.xml updated at $outPath"
