param(
    [Parameter(Mandatory = $true)][string]$BackupPath,
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$PgRestorePath = "pg_restore",
    [switch]$ListOnly,
    [switch]$ConfirmRestore
)

$ErrorActionPreference = 'Stop'
$resolvedBackup = [System.IO.Path]::GetFullPath($BackupPath)
if (-not (Test-Path -LiteralPath $resolvedBackup -PathType Leaf)) { throw "Backup not found: $resolvedBackup" }
if (-not $DatabaseUrl -or -not $DatabaseUrl.StartsWith('postgresql://')) { throw 'DATABASE_URL must be a PostgreSQL connection URL.' }

$checksumFile = "$resolvedBackup.sha256"
if (-not (Test-Path -LiteralPath $checksumFile)) { throw "Checksum file not found: $checksumFile" }
$expected = ((Get-Content -LiteralPath $checksumFile -Raw).Trim() -split '\s+')[0].ToLowerInvariant()
$actual = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash.ToLowerInvariant()
if ($expected -ne $actual) { throw 'Backup checksum verification failed. Restore has been stopped.' }

if ($ListOnly) {
    & $PgRestorePath --list $resolvedBackup
    exit $LASTEXITCODE
}
if (-not $ConfirmRestore) {
    throw 'Restore replaces objects in the target database. Re-run with -ConfirmRestore after validating the target and backup manifest.'
}

& $PgRestorePath --dbname=$DatabaseUrl --clean --if-exists --no-owner --no-privileges --exit-on-error $resolvedBackup
if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed. Keep services stopped and inspect the restore output.' }
Write-Host "PostgreSQL restore completed and checksum verified: $resolvedBackup"

