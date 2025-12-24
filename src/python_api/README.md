# SMART Oilfield — Python API

FastAPI service for telemetry ingestion, querying, and CSV export backed by local SQLite.

## Prerequisites
- Python 3.13
- Dependencies: FastAPI, Uvicorn, Pydantic (see `requirements.txt`)

## Setup
```powershell
# From repo root
Push-Location "D:\_SCHOOL\MASTERS\Sem1\ICT APPLICATION IN OIL AND GAS\Project\src\python_api"
python -m venv .venv
& ".venv\Scripts\python.exe" -m pip install -r requirements.txt
```

## Seed Data
```powershell
& ".venv\Scripts\python.exe" app\seed.py
```
- Creates the database at `data/processed/oilfield.db` and inserts one sample row.

## Run the API
```powershell
& ".venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints
- GET `/health` — service health
- POST `/api/telemetry` — insert a telemetry record
- GET `/api/telemetry` — list telemetry with optional filters
  - Query params: `device_id`, `ts_from`, `ts_to`, `limit`
- GET `/api/telemetry/{id}` — fetch one record by id
- DELETE `/api/telemetry/{id}` — delete by id
- GET `/api/telemetry/export` — CSV export (same filters as list)

## Examples
```powershell
# Health
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"

# Insert sample
$body = @{ device_id="well-004"; ts=[int][double]((Get-Date).ToFileTimeUtc()/10000000 - 11644473600); temperature=80.1; pressure=205.4; status="OK" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/telemetry" -ContentType "application/json" -Body $body

# List
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/telemetry?device_id=well-004&limit=5"

# CSV export
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/telemetry/export?device_id=well-004&limit=100" | Select-Object -ExpandProperty Content
```

## Code References
- App entry: [src/python_api/app/main.py](../python_api/app/main.py)
- Seed script: [src/python_api/app/seed.py](../python_api/app/seed.py)
- Local tests (no server): [src/python_api/app/test_endpoints.py](../python_api/app/test_endpoints.py)

## Notes
- The database file is stored at `data/processed/oilfield.db`.
- For production, consider migrating to SQLAlchemy with Postgres.
