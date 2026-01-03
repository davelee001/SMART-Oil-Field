from pathlib import Path
import sqlite3
import time
from typing import Optional
from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

DB = Path(__file__).resolve().parents[3] / 'data' / 'processed' / 'oilfield.db'

def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB)
    conn.execute('CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT, ts INTEGER, temperature REAL, pressure REAL, status TEXT)')
    # Table for subscription tracking (demo purposes - production would use blockchain)
    conn.execute('''CREATE TABLE IF NOT EXISTS subscriptions 
                    (user_id TEXT PRIMARY KEY, 
                     plan_id INTEGER, 
                     expires_at INTEGER, 
                     is_active BOOLEAN DEFAULT 1,
                     created_at INTEGER)''')
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

@app.get('/api/telemetry/stats')
def stats(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None):
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    base = 'FROM telemetry'
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
    where = (' WHERE ' + ' AND '.join(clauses)) if clauses else ''
    # aggregates
    q = (
        'SELECT COUNT(*) as count,'
        ' MIN(temperature), MAX(temperature), AVG(temperature),'
        ' MIN(pressure), MAX(pressure), AVG(pressure) '
        + base + where
    )
    cur.execute(q, tuple(params))
    row = cur.fetchone()
    count = row[0] if row and row[0] is not None else 0
    tmin = row[1]
    tmax = row[2]
    tavg = row[3]
    pmin = row[4]
    pmax = row[5]
    pavg = row[6]
    # latest status
    q2 = 'SELECT status FROM telemetry' + where + ' ORDER BY ts DESC LIMIT 1'
    cur.execute(q2, tuple(params))
    row2 = cur.fetchone()
    latest_status = row2[0] if row2 else None
    conn.close()
    return {
        'count': count,
        'temperature': {'min': tmin, 'max': tmax, 'avg': tavg},
        'pressure': {'min': pmin, 'max': pmax, 'avg': pavg},
        'latest_status': latest_status,
    }

# Subscription endpoints
class SubscriptionCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    plan_id: int = Field(ge=1)
    duration_days: int = Field(ge=1, default=30)

@app.post('/api/subscription')
def create_subscription(payload: SubscriptionCreate):
    """Create or update a user subscription (demo endpoint - production uses blockchain)"""
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    now = int(time.time())
    expires_at = now + (payload.duration_days * 24 * 60 * 60)
    
    # Upsert subscription
    cur.execute('''INSERT OR REPLACE INTO subscriptions 
                   (user_id, plan_id, expires_at, is_active, created_at) 
                   VALUES (?, ?, ?, 1, ?)''', 
                (payload.user_id, payload.plan_id, expires_at, now))
    conn.commit()
    conn.close()
    return {
        'user_id': payload.user_id,
        'plan_id': payload.plan_id,
        'expires_at': expires_at,
        'is_active': True
    }

@app.get('/api/subscription/{user_id}')
def get_subscription(user_id: str):
    """Get subscription status for a user"""
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute('SELECT user_id, plan_id, expires_at, is_active, created_at FROM subscriptions WHERE user_id = ?', (user_id,))
    row = cur.fetchone()
    conn.close()
    
    if not row:
        return {'error': 'not_found', 'message': 'No subscription found for this user'}
    
    now = int(time.time())
    expires_at = row[2]
    is_active = row[3] and expires_at > now
    days_remaining = max(0, (expires_at - now) // (24 * 60 * 60))
    hours_remaining = max(0, (expires_at - now) // 3600)
    
    return {
        'user_id': row[0],
        'plan_id': row[1],
        'expires_at': expires_at,
        'is_active': is_active,
        'created_at': row[4],
        'days_remaining': days_remaining,
        'hours_remaining': hours_remaining,
        'expired': expires_at <= now,
        'needs_reminder': days_remaining <= 7 and is_active
    }

@app.delete('/api/subscription/{user_id}')
def cancel_subscription(user_id: str):
    """Cancel a user subscription"""
    conn = sqlite3.connect(DB)
    cur = conn.cursor()
    cur.execute('UPDATE subscriptions SET is_active = 0 WHERE user_id = ?', (user_id,))
    conn.commit()
    count = cur.rowcount
    conn.close()
    return {'canceled': count > 0, 'user_id': user_id}
