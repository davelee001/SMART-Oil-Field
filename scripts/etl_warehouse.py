import os
from pathlib import Path
import duckdb

ROOT = Path(__file__).resolve().parents[1]
SQLITE_DB = ROOT / 'data' / 'processed' / 'oilfield.db'
DUCKDB_FILE = ROOT / 'data' / 'processed' / 'warehouse.duckdb'
PARQUET_DIR = ROOT / 'data' / 'processed' / 'warehouse' / 'parquet'

PARQUET_DIR.mkdir(parents=True, exist_ok=True)
DUCKDB_FILE.parent.mkdir(parents=True, exist_ok=True)

con = duckdb.connect(str(DUCKDB_FILE))

# Enable SQLite scanner
con.execute("INSTALL sqlite;")
con.execute("LOAD sqlite;")
con.execute(f"ATTACH '{SQLITE_DB.as_posix()}' AS sqlite_db (TYPE sqlite);")

# Create/refresh warehouse tables from SQLite
con.execute("DROP TABLE IF EXISTS wh_telemetry;")
con.execute("CREATE TABLE wh_telemetry AS SELECT id, device_id, ts, temperature, pressure, status FROM sqlite_db.telemetry;")

con.execute("DROP TABLE IF EXISTS wh_oil_batches;")
con.execute("CREATE TABLE wh_oil_batches AS SELECT batch_id, origin, volume, unit, created_at, current_stage, status, metadata FROM sqlite_db.oil_batches;")

con.execute("DROP TABLE IF EXISTS wh_oil_events;")
con.execute("CREATE TABLE wh_oil_events AS SELECT id, batch_id, ts, stage, status, location_lat, location_lon, facility, notes, extra FROM sqlite_db.oil_events;")

# Rollups (hourly aggregates)
con.execute("DROP TABLE IF EXISTS wh_telemetry_hourly;")
con.execute(
    """
    CREATE TABLE wh_telemetry_hourly AS
    SELECT 
        device_id,
        date_trunc('hour', to_timestamp(ts)) AS hour_bucket,
        COUNT(*) AS count,
        MIN(temperature) AS temperature_min,
        MAX(temperature) AS temperature_max,
        AVG(temperature) AS temperature_avg,
        MIN(pressure) AS pressure_min,
        MAX(pressure) AS pressure_max,
        AVG(pressure) AS pressure_avg
    FROM wh_telemetry
    GROUP BY device_id, hour_bucket
    ORDER BY hour_bucket DESC;
    """
)

# Export Parquet files for BI tools
con.execute(f"COPY wh_telemetry TO '{(PARQUET_DIR / 'wh_telemetry.parquet').as_posix()}' (FORMAT PARQUET);")
con.execute(f"COPY wh_telemetry_hourly TO '{(PARQUET_DIR / 'wh_telemetry_hourly.parquet').as_posix()}' (FORMAT PARQUET);")
con.execute(f"COPY wh_oil_batches TO '{(PARQUET_DIR / 'wh_oil_batches.parquet').as_posix()}' (FORMAT PARQUET);")
con.execute(f"COPY wh_oil_events TO '{(PARQUET_DIR / 'wh_oil_events.parquet').as_posix()}' (FORMAT PARQUET);")

print("ETL complete:\n -", DUCKDB_FILE)
print("Parquet outputs:")
for p in PARQUET_DIR.glob('*.parquet'):
    print(" -", p)
