# Backup & Disaster Recovery Guide

This guide covers automated backups and restore procedures for the SMART Oilfield platform.

## Overview

The backup system covers:
- SQLite database (`oilfield.db`)
- DuckDB warehouse (`oilfield_wh.duckdb`)
- Parquet files (ETL outputs)
- Configuration files (`.env`, `etl.config.json`)

Backups are stored in `data/backups/` with timestamps.

## Backup Script

Run the backup script from the repo root:

```powershell
# Full backup
.\scripts\backup.ps1

# Compressed backup
.\scripts\backup.ps1 -Compress

# Custom backup directory
.\scripts\backup.ps1 -BackupDir "C:\mybackups"
```

The script creates a timestamped backup (e.g., `backup_20260111_120000.db`).

## Restore Script

To restore from a backup:

```powershell
# Dry run (preview)
.\scripts\restore.ps1 -Timestamp "20260111_120000" -DryRun

# Actual restore
.\scripts\restore.ps1 -Timestamp "20260111_120000"
```

## Scheduled Backups

Set up a Windows Scheduled Task for daily backups:

1. Open Task Scheduler
2. Create a new task
3. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-File "D:\path\to\repo\scripts\backup.ps1" -Compress`
4. Triggers: Daily at 2 AM
5. Run with highest privileges

## Retention Policy

- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep last 12 monthly backups

Manually delete older backups from `data/backups/`.

## Disaster Recovery Plan

1. **Stop all services** (Python API, TS backend, Celery workers)
2. **Identify last good backup** (check timestamps)
3. **Run restore script** with the chosen timestamp
4. **Verify data integrity** (run tests or manual checks)
5. **Restart services**
6. **Monitor logs** for any issues

## Monitoring

- Check backup logs for errors
- Verify backup file sizes (should not be zero)
- Test restore periodically (e.g., monthly)

## Security

- Backups contain sensitive data (API keys, tokens)
- Store backups in secure locations
- Encrypt backups if storing off-site
- Limit access to backup files