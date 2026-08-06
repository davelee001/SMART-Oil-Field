# SMART Oilfield — Python API

FastAPI service for telemetry ingestion, querying, and CSV export backed by local SQLite with SQLAlchemy connection pooling.

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

### Optional: Redis Caching
- Install and run Redis (default at 127.0.0.1:6379). On Windows, use Docker or WSL.
- Environment variables:
  - `REDIS_HOST` (default `127.0.0.1`)
  - `REDIS_PORT` (default `6379`)
- Cached endpoints:
  - `GET /api/telemetry/stats` (TTL 60s)
  - `GET /api/oil/track/{batch_id}` (TTL 60s)

### Connection Pooling (SQLite via SQLAlchemy)
### Background Tasks (Celery)
### Time-Series (InfluxDB)
- Optional InfluxDB integration for telemetry write/read.
- Environment variables:
  - `INFLUX_URL` — e.g., `http://127.0.0.1:8086`
  - `INFLUX_TOKEN` — your InfluxDB API token
  - `INFLUX_ORG` — organization name
  - `INFLUX_BUCKET` — bucket name
- Behavior:
  - `POST /api/telemetry` writes to SQLite and, if configured, to InfluxDB (`telemetry` measurement) with fields `temperature`, `pressure`, `status` and tag `device_id`.
  - `GET /api/telemetry/influx?device_id=&limit=` queries recent points from InfluxDB (30d window) and falls back to SQLite if not configured.
-### Indexing Optimizations
- SQLite indexes are created automatically on startup to speed up common queries:
- `telemetry(device_id, ts)` and `telemetry(ts)` — accelerates filtered lists, stats, and exports
- `oil_batches(current_stage, status)` and `oil_batches(created_at)` — speeds up filtered lists and recent batches
- `oil_events(batch_id, ts)` — optimizes per-batch timeline queries
- Broker: Redis by default (`CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`).
- Start worker:
  ```powershell
  # From src/python_api
  & ".venv\Scripts\celery.exe" -A app.tasks.celery_app worker -l info
  ```
- Endpoints:
  - `POST /api/telemetry/export/async` → returns `{ task_id }`
  - `GET /api/tasks/{task_id}` → returns status and result
  - Result includes JSON with `meta` and `csv`.
- The API uses a pooled SQLAlchemy engine for the local SQLite database to reduce connection overhead and improve concurrency.
- Environment variables:
  - `DB_POOL_SIZE` (default `5`)
  - `DB_MAX_OVERFLOW` (default `10`)
- Database path: `data/processed/oilfield.db` (created automatically on startup)





## Endpoints
- GET `/health` — service health
- POST `http://localhost:4000/api/auth/login` — authenticate against the PostgreSQL PMS identity service and obtain a JWT
- POST `/api/telemetry` — insert a telemetry record with a PMS JWT and an authorized role
- GET `/api/telemetry` — list telemetry with optional filters
  - Query params: `device_id`, `ts_from`, `ts_to`, `limit`, `page`
- GET `/api/telemetry/{id}` — fetch one record by id
- DELETE `/api/telemetry/{id}` — delete by id
- GET `/api/telemetry/export` — CSV export (same filters as list)
- POST `/api/telemetry/export/async` — Async CSV export (returns task id)
- GET `/api/tasks/{task_id}` — Task status/result

### Machine Learning
- Train model:
  ```powershell
  # From repo root
  python scripts/train_ml.py
  ```
- Inference endpoint:
  - `POST /api/ml/predict` — body `{ temperature, pressure, device_id?, ts? }`
  - Returns: `{ anomaly: bool, score: float, model: "rf"|"rule", meta }`
  - Uses a trained RandomForest if available; falls back to rule-based scoring.



## Examples
```powershell
# Health
Invoke-RestMethod -Uri "http://127.0.0.1:8000/health"

# Get a JWT from the central PMS API
$login = @{ email=$env:ADMIN_EMAIL; password=$env:ADMIN_PASSWORD } | ConvertTo-Json
$tokenResp = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:4000/api/auth/login" -ContentType "application/json" -Body $login
$token = $tokenResp.accessToken

# Insert sample (JWT and API key required)
$body = @{ device_id="well-004"; ts=[int][double]((Get-Date).ToFileTimeUtc()/10000000 - 11644473600); temperature=80.1; pressure=205.4; status="OK" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/telemetry" -ContentType "application/json" -Body $body -Headers @{ Authorization = "Bearer $token" }

# List
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/telemetry?device_id=well-004&limit=5"

# CSV export
Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/telemetry/export?device_id=well-004&limit=100" | Select-Object -ExpandProperty Content

# ML inference
$mlBody = @{ temperature=92.3; pressure=270.0; device_id="well-004" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/api/ml/predict" -ContentType "application/json" -Body $mlBody
```

## Code References
- App entry: [src/python_api/app/main.py](../python_api/app/main.py)
- Seed script: [src/python_api/app/seed.py](../python_api/app/seed.py)
- Local tests (no server): [src/python_api/app/test_endpoints.py](../python_api/app/test_endpoints.py)






## Security
- JWT authentication is required for protected write endpoints. Tokens are issued by the PostgreSQL-backed Express PMS API.
- The FastAPI service validates the same HS256 secret, issuer, audience, expiry, and PMS role claim as the central API.
- Protected writes also call `AUTH_INTROSPECTION_URL` (default `http://localhost:4000/api/auth/me`) so account disabling, logout, role changes, and token-version revocation take effect immediately across services.
- Role-based access control is enforced for telemetry ingestion, configuration changes, CSV uploads, oil-movement writes, and subscription mutations.
- Rate limiting is enforced per user/endpoint (default: 10 requests per minute).
- Configure `JWT_SECRET`, `JWT_ISSUER`, and `JWT_AUDIENCE` identically for the Express and FastAPI services.
- There are no hard-coded FastAPI users, passwords, or demo API keys.

## Notes
- The database file is stored at `data/processed/oilfield.db`.
- Redis caching is opportunistic: if Redis is unavailable, the API still works without caching.
- For production, consider migrating to SQLAlchemy with Postgres and a proper user/auth system.
