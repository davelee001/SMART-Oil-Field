param(
    [string]$BackupDir = "$PSScriptRoot\..\data\backups",
    [switch]$Compress
)

$ErrorActionPreference = 'Stop'

# Ensure backup directory exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupBase = Join-Path $BackupDir "backup_$timestamp"

# Backup SQLite DB
$dbPath = "$PSScriptRoot\..\data\processed\oilfield.db"
if (Test-Path $dbPath) {
    Copy-Item $dbPath "$backupBase.db"
    Write-Host "Backed up SQLite DB to $backupBase.db"
} else {
    Write-Warning "SQLite DB not found at $dbPath"
}

# Backup DuckDB warehouse (if exists)
$duckdbPath = "$PSScriptRoot\..\data\processed\warehouse\oilfield_wh.duckdb"
if (Test-Path $duckdbPath) {
    Copy-Item $duckdbPath "$backupBase.duckdb"
    Write-Host "Backed up DuckDB to $backupBase.duckdb"
} else {
    Write-Warning "DuckDB warehouse not found at $duckdbPath"
}

# Backup Parquet files
$parquetDir = "$PSScriptRoot\..\data\processed\warehouse"
if (Test-Path $parquetDir) {
    $parquetFiles = Get-ChildItem $parquetDir -Filter "*.parquet" -Recurse
    if ($parquetFiles) {
        $parquetBackupDir = "$backupBase.parquet"
        New-Item -ItemType Directory -Path $parquetBackupDir | Out-Null
        foreach ($file in $parquetFiles) {
            Copy-Item $file.FullName (Join-Path $parquetBackupDir $file.Name)
        }
        Write-Host "Backed up Parquet files to $parquetBackupDir"
    } else {
        Write-Warning "No Parquet files found in $parquetDir"
    }
}

# Backup configs (env files, etc.)
$configFiles = @(
    "$PSScriptRoot\..\src\python_api\.env",
    "$PSScriptRoot\..\src\ts_backend\.env",
    "$PSScriptRoot\..\scripts\etl.config.json"
)
$configBackupDir = "$backupBase.configs"
New-Item -ItemType Directory -Path $configBackupDir | Out-Null
foreach ($config in $configFiles) {
    if (Test-Path $config) {
        Copy-Item $config (Join-Path $configBackupDir (Split-Path $config -Leaf))
    }
}
Write-Host "Backed up configs to $configBackupDir"

# Compress if requested
if ($Compress) {
    $zipPath = "$backupBase.zip"
    Compress-Archive -Path "$backupBase.*" -DestinationPath $zipPath
    Remove-Item "$backupBase.*" -Recurse -Force
    Write-Host "Compressed backup to $zipPath"
}

Write-Host "Backup completed at $BackupDir"