# Oil Movement Tracker

This feature tracks oil movement from drilling through extraction, storage, transportation, refining, and final delivery.

## Data Model
- Batch: `batch_id`, `origin`, `volume`, `unit`, `created_at`, `current_stage`, `status`, `metadata`
- Event: `id`, `batch_id`, `ts`, `stage`, `status`, `location_lat`, `location_lon`, `facility`, `notes`, `extra`

## API (Python FastAPI)
- POST `/api/oil/batches` — Create new batch
  - body: `{ batch_id?, origin, volume, unit?, status?, metadata? }`
- GET `/api/oil/batches` — List batches `?stage=&status=&limit=&page=`
- GET `/api/oil/batches/{batch_id}` — Get batch
- POST `/api/oil/batches/{batch_id}/events` — Add lifecycle event
  - body: `{ ts?, stage, status?, location_lat?, location_lon?, facility?, notes?, extra? }`
- GET `/api/oil/batches/{batch_id}/events` — List events `?ascending=&limit=&page=` (if `limit` omitted, returns all)
- GET `/api/oil/track/{batch_id}` — Batch + ordered events + per-stage durations (seconds)

## Frontend
- New "Oil Movement Tracker" card with actions to:
  - Create Oil Batch
  - Add Lifecycle Event
  - View Batch Timeline

## Gateway (TypeScript)
Proxy routes are added so the tracker can be used via the TS backend if desired.

## Quick Try
1. Seed demo data:
```
cd src/python_api/app
python seed.py
```
2. Start Python API (or use VS Code Task):
```
cd ../../..
# Or use task: Run Python API
```
3. In the frontend (open `src/frontend/index.html`), use the Oil Movement Tracker card.

## Notes
- SQLite is used for demo simplicity. For production, use a managed database and add proper auth, validation, and schema migrations.
- `durations_sec` are computed from ordered events; last stage is measured up to now.
