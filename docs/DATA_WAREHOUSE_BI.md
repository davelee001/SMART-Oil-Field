# Data Warehouse & BI Guide

This guide covers the analytics warehouse (DuckDB) and connecting BI tools (Power BI, Tableau).

## Overview
- Operational DB: SQLite at `data/processed/oilfield.db`
- Warehouse: DuckDB at `data/processed/warehouse.duckdb`
- Parquet outputs: `data/processed/warehouse/parquet/*.parquet`
- ETL script: `scripts/etl_warehouse.py`

## Run ETL
```powershell
# From repo root
python scripts/etl_warehouse.py
```
Outputs:
- Creates/refreshes warehouse tables: `wh_telemetry`, `wh_oil_batches`, `wh_oil_events`
- Creates rollup table: `wh_telemetry_hourly`
- Exports Parquet files for BI tools

## Power BI (Desktop)
Option A: Parquet files
1. Open Power BI Desktop
2. Get Data → Parquet
3. Select folder `data/processed/warehouse/parquet`
4. Choose `wh_telemetry_hourly.parquet` (and others as needed)
5. Load and build visuals (e.g., line chart of temperature_avg by hour_bucket)

Option B: DuckDB ODBC (advanced)
1. Install DuckDB ODBC driver
2. Get Data → ODBC → select DuckDB DSN
3. Connect to `data/processed/warehouse.duckdb`
4. Choose tables (e.g., `wh_telemetry_hourly`)

## Tableau (Desktop)
Option A: Parquet files
1. Open Tableau
2. Connect → Parquet
3. Select `data/processed/warehouse/parquet/wh_telemetry_hourly.parquet`
4. Build dashboard (e.g., avg pressure by hour)

Option B: DuckDB ODBC (advanced)
1. Install DuckDB ODBC driver
2. Connect → More → Other Databases (ODBC)
3. Select DSN for DuckDB and connect to `warehouse.duckdb`

## Suggested Visuals
- Telemetry Trends: Hourly averages of temperature and pressure by device
- Status Distribution: Pie/bar of latest statuses per device
- Oil Batch Throughput: Batches per week/month, by status/stage
- Event Timeline: Event count by stage over time

## Scheduling (optional)
- Use Windows Task Scheduler to run `python scripts/etl_warehouse.py` nightly
- Future: Add `scripts/etl.config.json` to configure frequency and destinations

## Notes
- DuckDB and Parquet keep analytics local and portable; switch to Postgres/BigQuery later if needed.
- Ensure the Python API writes to SQLite before running ETL, or configure direct InfluxDB → warehouse pipelines separately.
