from pathlib import Path
import sqlite3
from typing import Optional
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

DB = Path(__file__).resolve().parents[3] / 'data' / 'processed' / 'oilfield.db'

def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.execute('CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT, ts INTEGER, temperature REAL, pressure REAL, status TEXT)')
    conn.commit()
    conn.close()

app = FastAPI(title='SMART Oilfield API', version='0.4.0')

class TelemetryIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    ts: int = Field(ge=0)
    temperature: float
    pressure: float
    status: str = Field(min_length=1, max_length=32)

@app.on_event('startup')
def _startup():
    init_db()

@app.get('/health')
def health():
    return {'status': 'ok'}

@app.post('/api/telemetry')
def ingest(payload: TelemetryIn):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute('INSERT INTO telemetry (device_id, ts, temperature, pressure, status) VALUES (?, ?, ?, ?, ?)', (payload.device_id, payload.ts, payload.temperature, payload.pressure, payload.status))
    conn.commit()
    id_ = cur.lastrowid
    conn.close()
    return {'id': id_}

@app.get('/api/telemetry')
def list(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 100):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    q = 'SELECT id, device_id, ts, temperature, pressure, status FROM telemetry'
    clauses = []
    params = []
    if device_id:
        clauses.append('device_id = ?')
        params.append(device_id)
    if ts_from is not None:
        clauses.append('ts >= ?')
        params.append(ts_from)
    if ts_to is not None:
        clauses.append('ts <= ?')
        params.append(ts_to)
    if clauses:
        q += ' WHERE ' + ' AND '.join(clauses)
    q += ' ORDER BY ts DESC LIMIT ?'
    params.append(limit)
    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()
    return [{'id': r[0], 'device_id': r[1], 'ts': r[2], 'temperature': r[3], 'pressure': r[4], 'status': r[5]} for r in rows]

@app.get('/api/telemetry/{id}')
def get_one(id: int):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute('SELECT id, device_id, ts, temperature, pressure, status FROM telemetry WHERE id = ?', (id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return {'error': 'not_found'}
    return {'id': row[0], 'device_id': row[1], 'ts': row[2], 'temperature': row[3], 'pressure': row[4], 'status': row[5]}

@app.delete('/api/telemetry/{id}')
def delete_one(id: int):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute('DELETE FROM telemetry WHERE id = ?', (id,))
    conn.commit()
    count = cur.rowcount
    conn.close()
    return {'deleted': count}

@app.get('/api/telemetry/export', response_class=PlainTextResponse)
def export_csv(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 1000):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    q = 'SELECT id, device_id, ts, temperature, pressure, status FROM telemetry'
    clauses = []
    params = []
    if device_id:
        clauses.append('device_id = ?')
        params.append(device_id)
    if ts_from is not None:
        clauses.append('ts >= ?')
        params.append(ts_from)
    if ts_to is not None:
        clauses.append('ts <= ?')
        params.append(ts_to)
    if clauses:
        q += ' WHERE ' + ' AND '.join(clauses)
    q += ' ORDER BY ts DESC LIMIT ?'
    params.append(limit)
    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()
    header = 'id,device_id,ts,temperature,pressure,status'
    lines = [header] + [f"{r[0]},{r[1]},{r[2]},{r[3]},{r[4]},{r[5]}" for r in rows]
    return "\n".join(lines)
