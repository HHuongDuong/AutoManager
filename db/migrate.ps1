Param(
  [string]$DatabaseUrl = "postgres://automanager:secret@localhost:5432/automanager"
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
  Write-Host "DATABASE_URL is required. Set it in environment or pass -DatabaseUrl." -ForegroundColor Red
  exit 1
}

$basePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$migrationsPath = Join-Path $basePath "migrations"

if (-not (Test-Path $migrationsPath)) {
  Write-Host "Migrations folder not found: $migrationsPath" -ForegroundColor Red
  exit 1
}

$files = Get-ChildItem -Path $migrationsPath -Filter "*.sql" | Sort-Object Name
if ($files.Count -eq 0) {
  Write-Host "No .sql migrations found in $migrationsPath" -ForegroundColor Yellow
  exit 0
}

psql $DatabaseUrl -v ON_ERROR_STOP=1 -q -c "SET client_encoding = 'UTF8'; CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now(), checksum TEXT);"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to ensure schema_migrations table" -ForegroundColor Red
  exit $LASTEXITCODE
}

$lockId = 873624
foreach ($file in $files) {
  if (Select-String -Path $file.FullName -Pattern "\bCOMMIT\b" -Quiet) {
    Write-Host "COMMIT detected in $($file.Name). Remove it." -ForegroundColor Red
    exit 1
  }

  $checksum = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
  $checkCmd = "SELECT 1 FROM schema_migrations WHERE filename = '$($file.Name)'"
  $alreadyApplied = [string](psql $DatabaseUrl -v ON_ERROR_STOP=1 -t -A -q -c "SET client_encoding = 'UTF8'; $checkCmd")
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to check migration state for $($file.Name)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
  if ($null -eq $alreadyApplied) { $alreadyApplied = '' }
  $alreadyApplied = $alreadyApplied.Trim()
  if ($alreadyApplied -eq "1") {
    $checksumCmd = "SELECT checksum FROM schema_migrations WHERE filename = '$($file.Name)'"
    $storedChecksum = [string](psql $DatabaseUrl -v ON_ERROR_STOP=1 -t -A -q -c "SET client_encoding = 'UTF8'; $checksumCmd")
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Failed to check checksum for $($file.Name)" -ForegroundColor Red
      exit $LASTEXITCODE
    }
    if ($null -eq $storedChecksum) { $storedChecksum = '' }
    $storedChecksum = $storedChecksum.Trim()
    if ($storedChecksum -and $storedChecksum -ne $checksum) {
      Write-Host "Checksum mismatch for $($file.Name). Stop deploy." -ForegroundColor Red
      exit 1
    }
    Write-Host "Skipping $($file.Name) (already applied)" -ForegroundColor DarkGray
    continue
  }

  Write-Host "Applying $($file.Name)..." -ForegroundColor Cyan
  $tempFile = New-TemporaryFile
  try {
    $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $fileContent = [System.Text.Encoding]::UTF8.GetString($bytes)
  } catch {
    $fileContent = Get-Content -Raw $file.FullName
  }
  if ($fileContent.Length -gt 0 -and [int]$fileContent[0] -eq 0xFEFF) {
    $fileContent = $fileContent.Substring(1)
  }
  $content = @"
BEGIN;
SELECT pg_advisory_xact_lock($lockId);
$fileContent
INSERT INTO schema_migrations (filename, checksum) VALUES ('$($file.Name)', '$checksum');
COMMIT;
"@
  [System.IO.File]::WriteAllText($tempFile, $content, (New-Object System.Text.UTF8Encoding($false)))

  psql $DatabaseUrl -v ON_ERROR_STOP=1 -q -c "SET client_encoding = 'UTF8';" -f $tempFile
  Remove-Item $tempFile
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed on $($file.Name)" -ForegroundColor Red
    exit $LASTEXITCODE
  }
}

Write-Host "All migrations applied." -ForegroundColor Green
