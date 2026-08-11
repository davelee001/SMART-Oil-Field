param(
    [string]$DatabaseUrl = $env:DATABASE_URL,
    [string]$BackupDir = "$PSScriptRoot\..\data\backups\postgres",
    [string]$PgDumpPath = "pg_dump",
    [ValidateRange(1, 3650)][int]$RetentionDays = 35
)

$ErrorActionPreference = 'Stop'
if (-not $DatabaseUrl -or -not $DatabaseUrl.StartsWith('postgresql://')) {
    throw 'DATABASE_URL must be a PostgreSQL connection URL.'
}

$resolvedBackupDir = [System.IO.Path]::GetFullPath($BackupDir)
New-Item -ItemType Directory -Path $resolvedBackupDir -Force | Out-Null
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMddTHHmmssZ')
$backupPath = Join-Path $resolvedBackupDir "smart_oil_field_$timestamp.dump"
$checksumPath = "$backupPath.sha256"
$manifestPath = "$backupPath.json"

& $PgDumpPath --dbname=$DatabaseUrl --format=custom --compress=9 --no-owner --no-privileges --file=$backupPath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -eq 0) {
    throw 'pg_dump failed or produced an empty backup.'
}

$checksum = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath $checksumPath -Value "$checksum  $([System.IO.Path]::GetFileName($backupPath))" -Encoding ascii
@{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    database = 'smart_oil_field'
    format = 'PostgreSQL custom archive'
    file = [System.IO.Path]::GetFileName($backupPath)
    bytes = (Get-Item -LiteralPath $backupPath).Length
    sha256 = $checksum
} | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8

$cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)
Get-ChildItem -LiteralPath $resolvedBackupDir -File -Filter 'smart_oil_field_*.dump*' |
    Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
    Remove-Item -Force

Write-Host "PostgreSQL backup created: $backupPath"
Write-Host "SHA-256: $checksum"

