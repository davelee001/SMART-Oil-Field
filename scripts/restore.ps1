param(
    [string]$BackupDir = "$PSScriptRoot\..\data\backups",
    [string]$Timestamp,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

if (-not $Timestamp) {
    Write-Error "Specify -Timestamp (e.g., 20260111_120000)"
    exit 1
}

$backupBase = Join-Path $BackupDir "backup_$Timestamp"

# Check if backup exists
$backupExists = $false
if (Test-Path "$backupBase.zip") {
    $backupExists = $true
    $zipPath = "$backupBase.zip"
} elseif (Test-Path "$backupBase.db") {
    $backupExists = $true
}

if (-not $backupExists) {
    Write-Error "Backup not found for timestamp $Timestamp"
    exit 1
}

if ($DryRun) {
    Write-Host "DRY RUN: Would restore from $backupBase"
    if (Test-Path "$backupBase.zip") {
        Write-Host "Would extract $zipPath"
    }
    Write-Host "Would restore SQLite DB to $PSScriptRoot\..\data\processed\oilfield.db"
    Write-Host "Would restore DuckDB to $PSScriptRoot\..\data\processed\warehouse\oilfield_wh.duckdb"
    Write-Host "Would restore Parquet files to $PSScriptRoot\..\data\processed\warehouse\"
    Write-Host "Would restore configs"
    exit 0
}

# Extract if compressed
if (Test-Path "$backupBase.zip") {
    Expand-Archive -Path "$backupBase.zip" -DestinationPath $BackupDir
    Write-Host "Extracted backup from $backupBase.zip"
}

# Restore SQLite DB
$dbBackup = "$backupBase.db"
$dbTarget = "$PSScriptRoot\..\data\processed\oilfield.db"
if (Test-Path $dbBackup) {
    Copy-Item $dbBackup $dbTarget -Force
    Write-Host "Restored SQLite DB from $dbBackup"
} else {
    Write-Warning "SQLite DB backup not found"
}

# Restore DuckDB
$duckdbBackup = "$backupBase.duckdb"
$duckdbTarget = "$PSScriptRoot\..\data\processed\warehouse\oilfield_wh.duckdb"
if (Test-Path $duckdbBackup) {
    Copy-Item $duckdbBackup $duckdbTarget -Force
    Write-Host "Restored DuckDB from $duckdbBackup"
} else {
    Write-Warning "DuckDB backup not found"
}

# Restore Parquet files
$parquetBackupDir = "$backupBase.parquet"
$parquetTargetDir = "$PSScriptRoot\..\data\processed\warehouse"
if (Test-Path $parquetBackupDir) {
    Copy-Item "$parquetBackupDir\*" $parquetTargetDir -Force -Recurse
    Write-Host "Restored Parquet files from $parquetBackupDir"
} else {
    Write-Warning "Parquet backup not found"
}

# Restore configs
$configBackupDir = "$backupBase.configs"
$configTargetDir = "$PSScriptRoot\..\src\python_api"
if (Test-Path $configBackupDir) {
    Copy-Item "$configBackupDir\*" $configTargetDir -Force
    Write-Host "Restored configs from $configBackupDir"
} else {
    Write-Warning "Config backup not found"
}

Write-Host "Restore completed"