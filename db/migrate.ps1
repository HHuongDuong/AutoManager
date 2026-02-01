Param(
  [string]$DatabaseUrl = $Env:DATABASE_URL
)

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

psql $DatabaseUrl -v ON_ERROR_STOP=1 -q -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now(), checksum TEXT);"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to ensure schema_migrations table" -ForegroundColor Red
  exit $LASTEXITCODE
}

$lockId = 873624
psql $DatabaseUrl -v ON_ERROR_STOP=1 -q -c "SELECT pg_advisory_lock($lockId);"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to acquire migration lock" -ForegroundColor Red
  exit $LASTEXITCODE
}

try {
  foreach ($file in $files) {
    if (Select-String -Path $file.FullName -Pattern "\bCOMMIT\b" -Quiet) {
      Write-Host "COMMIT detected in $($file.Name). Remove it." -ForegroundColor Red
      exit 1
    }

    $checksum = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
    $checkCmd = "SELECT 1 FROM schema_migrations WHERE filename = '$($file.Name)'"
    $alreadyApplied = (psql $DatabaseUrl -v ON_ERROR_STOP=1 -t -A -q -c $checkCmd).Trim()
    if ($alreadyApplied -eq "1") {
      $checksumCmd = "SELECT checksum FROM schema_migrations WHERE filename = '$($file.Name)'"
      $storedChecksum = (psql $DatabaseUrl -v ON_ERROR_STOP=1 -t -A -q -c $checksumCmd).Trim()
      if ($storedChecksum -and $storedChecksum -ne $checksum) {
        Write-Host "Checksum mismatch for $($file.Name). Stop deploy." -ForegroundColor Red
        exit 1
      }
      Write-Host "Skipping $($file.Name) (already applied)" -ForegroundColor DarkGray
      continue
    }

    Write-Host "Applying $($file.Name)..." -ForegroundColor Cyan
    $tempFile = New-TemporaryFile
    @"
BEGIN;
$(Get-Content -Raw -Encoding UTF8 $file.FullName)
INSERT INTO schema_migrations (filename, checksum) VALUES ('$($file.Name)', '$checksum');
COMMIT;
"@ | Set-Content -Encoding UTF8 $tempFile

    psql $DatabaseUrl -v ON_ERROR_STOP=1 -q -f $tempFile
    Remove-Item $tempFile
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Failed on $($file.Name)" -ForegroundColor Red
      exit $LASTEXITCODE
    }
  }
} finally {
  psql $DatabaseUrl -v ON_ERROR_STOP=1 -q -c "SELECT pg_advisory_unlock($lockId);" | Out-Null
}

Write-Host "All migrations applied." -ForegroundColor Green
