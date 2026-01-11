import threading

# Simple in-memory rate limiting (per user/endpoint)
RATE_LIMITS = {}
RATE_LIMIT_LOCK = threading.Lock()
RATE_LIMIT_MAX = 10  # max requests per minute

def rate_limit(user_id: str, endpoint: str):
    now = int(time.time())
    key = f"{user_id}:{endpoint}:{now // 60}"
    with RATE_LIMIT_LOCK:
        count = RATE_LIMITS.get(key, 0)
        if count >= RATE_LIMIT_MAX:
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        RATE_LIMITS[key] = count + 1
# Role-based access control (RBAC)
def require_role(role: str):
    def checker(user=Depends(get_current_user)):
        if user["role"] != role:
            raise HTTPException(status_code=403, detail=f"Requires {role} role")
        return user
    return checker
# API Key management (demo: in-memory, production: DB)
API_KEYS = {"demo-key-123": "admin", "demo-key-456": "user"}

from fastapi import Header

def get_api_key(x_api_key: str = Header(...)):
    if x_api_key not in API_KEYS:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return API_KEYS[x_api_key]
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import datetime, timedelta


# OAuth2 integration (using FastAPI's OAuth2PasswordBearer)
from fastapi.security import OAuth2AuthorizationCodeBearer

OAUTH2_CLIENT_ID = "demo-client-id"
OAUTH2_CLIENT_SECRET = "demo-client-secret"
OAUTH2_AUTH_URL = "https://demo-oauth-provider.com/auth"
OAUTH2_TOKEN_URL = "https://demo-oauth-provider.com/token"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")
oauth2_auth_code_scheme = OAuth2AuthorizationCodeBearer(
    authorizationUrl=OAUTH2_AUTH_URL,
    tokenUrl=OAUTH2_TOKEN_URL
)

# Dummy user store (replace with DB in production)
fake_users_db = {
    "admin": {"username": "admin", "password": "adminpass", "role": "admin"},
    "user": {"username": "user", "password": "userpass", "role": "user"}
}

def authenticate_user(username: str, password: str):
    user = fake_users_db.get(username)
    if not user or user["password"] != password:
        return None
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = fake_users_db.get(username)
    if user is None:
        raise credentials_exception
    return user

# Login endpoint to get JWT
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}
from pathlib import Path
import os
import sqlite3
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool
import time
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
import uuid
import json
import hashlib
try:
    import redis as redis_lib
except Exception:
    redis_lib = None

DB = Path(__file__).resolve().parents[3] / 'data' / 'processed' / 'oilfield.db'
DB_URL = f"sqlite:///{DB.as_posix()}"

# SQLAlchemy Engine with connection pooling for SQLite
ENGINE = None

def get_conn():
    global ENGINE
    if ENGINE is None:
        # Pool configuration via environment, with sensible defaults
        pool_size = int(os.environ.get('DB_POOL_SIZE', '5'))
        max_overflow = int(os.environ.get('DB_MAX_OVERFLOW', '10'))
        ENGINE = create_engine(
            DB_URL,
            poolclass=QueuePool,
            pool_size=pool_size,
            max_overflow=max_overflow,
            connect_args={"check_same_thread": False},
        )
    # Return a pooled DBAPI connection (sqlite3.Connection)
    return ENGINE.raw_connection()

def init_db():
    DB.parent.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    conn.execute('CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT, ts INTEGER, temperature REAL, pressure REAL, status TEXT)')
    # Table for subscription tracking (demo purposes - production would use blockchain)
    conn.execute('''CREATE TABLE IF NOT EXISTS subscriptions 
                    (user_id TEXT PRIMARY KEY, 
                     plan_id INTEGER, 
                     expires_at INTEGER, 
                     is_active BOOLEAN DEFAULT 1,
                     created_at INTEGER)''')
    # Oil movement tracking tables
    conn.execute('''CREATE TABLE IF NOT EXISTS oil_batches (
                        batch_id TEXT PRIMARY KEY,
                        origin TEXT,
                        volume REAL,
                        unit TEXT,
                        created_at INTEGER,
                        current_stage TEXT,
                        status TEXT,
                        metadata TEXT
                    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS oil_events (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        batch_id TEXT,
                        ts INTEGER,
                        stage TEXT,
                        status TEXT,
                        location_lat REAL,
                        location_lon REAL,
                        facility TEXT,
                        notes TEXT,
                        extra TEXT
                    )''')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_oil_events_batch_ts ON oil_events(batch_id, ts)')
    conn.commit()
    conn.close()

app = FastAPI(title='SMART Oilfield API', version='0.4.0')

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryIn(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    ts: int = Field(ge=0)
    temperature: float
    pressure: float
    status: str = Field(min_length=1, max_length=32)

# Oil Tracker models
class BatchCreate(BaseModel):
    batch_id: Optional[str] = Field(default=None, max_length=64)
    origin: str = Field(min_length=1, max_length=128)
    volume: float = Field(gt=0)
    unit: str = Field(default='bbl', max_length=16)
    status: str = Field(default='INITIATED', max_length=32)
    metadata: Optional[dict] = None

class EventCreate(BaseModel):
    ts: Optional[int] = None
    stage: str = Field(min_length=1, max_length=32)
    status: str = Field(default='IN_PROGRESS', max_length=32)
    location_lat: Optional[float] = None
    location_lon: Optional[float] = None
    facility: Optional[str] = Field(default=None, max_length=128)
    notes: Optional[str] = Field(default=None, max_length=512)
    extra: Optional[dict] = None

@app.on_event('startup')
def _startup():
    init_db()
    # Initialize Redis client if available
    global REDIS
    REDIS = None
    if redis_lib is not None:
        host = os.environ.get('REDIS_HOST', '127.0.0.1')
        port = int(os.environ.get('REDIS_PORT', '6379'))
        try:
            client = redis_lib.Redis(host=host, port=port, db=0)
            client.ping()
            REDIS = client
        except Exception:
            REDIS = None

# Cache helpers
def cache_key(prefix: str, params: dict) -> str:
    raw = prefix + '|' + json.dumps(params, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()

def cache_get(key: str):
    if REDIS is None:
        return None
    try:
        val = REDIS.get(key)
        if val is None:
            return None
        return json.loads(val)
    except Exception:
        return None

def cache_set(key: str, value, ttl: int = 60):
    if REDIS is None:
        return
    try:
        REDIS.setex(key, ttl, json.dumps(value))
    except Exception:
        pass

@app.get('/health')
def health():
    return {'status': 'ok'}


# Example: API key protected endpoint (telemetry ingest)

# Example: admin-only endpoint (RBAC)

# Example: admin-only endpoint (RBAC + rate limiting)
# Example: admin-only endpoint (RBAC + rate limiting)

# Example: OAuth2-protected endpoint (admin-only, rate limiting, API key)
@app.post('/api/telemetry')
async def ingest(
    payload: TelemetryIn,
    user=Depends(require_role("admin")),
    api_user=Depends(get_api_key),
    oauth2_token: str = Depends(oauth2_auth_code_scheme)
):
    rate_limit(user["username"], "/api/telemetry")
    # In production, validate oauth2_token with provider
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('INSERT INTO telemetry (device_id, ts, temperature, pressure, status) VALUES (?, ?, ?, ?, ?)', (payload.device_id, payload.ts, payload.temperature, payload.pressure, payload.status))
    conn.commit()
    id_ = cur.lastrowid
    conn.close()
    return {'id': id_, 'api_user': api_user, 'oauth2_token': oauth2_token}

@app.get('/api/telemetry')
def list(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 100, page: int = 1):
    conn = get_conn()
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
    # Pagination: LIMIT + OFFSET
    if page < 1:
        page = 1
    if limit < 1:
        limit = 1
    offset = (page - 1) * limit
    q += ' ORDER BY ts DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])
    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()
    return [{'id': r[0], 'device_id': r[1], 'ts': r[2], 'temperature': r[3], 'pressure': r[4], 'status': r[5]} for r in rows]

@app.get('/api/telemetry/{id}')
def get_one(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT id, device_id, ts, temperature, pressure, status FROM telemetry WHERE id = ?', (id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return {'error': 'not_found'}
    return {'id': row[0], 'device_id': row[1], 'ts': row[2], 'temperature': row[3], 'pressure': row[4], 'status': row[5]}

@app.delete('/api/telemetry/{id}')
def delete_one(id: int):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('DELETE FROM telemetry WHERE id = ?', (id,))
    conn.commit()
    count = cur.rowcount
    conn.close()
    return {'deleted': count}

@app.get('/api/telemetry/export', response_class=PlainTextResponse)
def export_csv(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 1000):
    conn = get_conn()
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
    # Try cache
    key = cache_key('telemetry_stats', {'device_id': device_id, 'ts_from': ts_from, 'ts_to': ts_to})
    cached = cache_get(key)
    if cached is not None:
        return cached
    conn = get_conn()
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
    result = {
        'count': count,
        'temperature': {'min': tmin, 'max': tmax, 'avg': tavg},
        'pressure': {'min': pmin, 'max': pmax, 'avg': pavg},
        'latest_status': latest_status,
    }
    cache_set(key, result, ttl=60)
    return result

# -------------------------------
# Oil Movement Tracker Endpoints
# -------------------------------

@app.post('/api/oil/batches')
def create_batch(payload: BatchCreate):
    conn = get_conn()
    cur = conn.cursor()
    batch_id = payload.batch_id or f"BATCH-{uuid.uuid4().hex[:8].upper()}"
    created_at = int(time.time())
    cur.execute(
        'INSERT OR REPLACE INTO oil_batches (batch_id, origin, volume, unit, created_at, current_stage, status, metadata) VALUES (?,?,?,?,?,?,?,?)',
        (
            batch_id,
            payload.origin,
            payload.volume,
            payload.unit,
            created_at,
            'DRILLING',
            payload.status,
            json.dumps(payload.metadata) if payload.metadata is not None else None,
        )
    )
    conn.commit()
    conn.close()
    return {
        'batch_id': batch_id,
        'origin': payload.origin,
        'volume': payload.volume,
        'unit': payload.unit,
        'created_at': created_at,
        'current_stage': 'DRILLING',
        'status': payload.status,
        'metadata': payload.metadata or {},
    }

@app.get('/api/oil/batches')
def list_batches(stage: Optional[str] = None, status: Optional[str] = None, limit: int = 50, page: int = 1):
    conn = get_conn()
    cur = conn.cursor()
    q = 'SELECT batch_id, origin, volume, unit, created_at, current_stage, status FROM oil_batches'
    clauses = []
    params = []
    if stage:
        clauses.append('current_stage = ?')
        params.append(stage)
    if status:
        clauses.append('status = ?')
        params.append(status)
    if clauses:
        q += ' WHERE ' + ' AND '.join(clauses)
    # Pagination: LIMIT + OFFSET
    if page < 1:
        page = 1
    if limit < 1:
        limit = 1
    offset = (page - 1) * limit
    q += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
    params.extend([limit, offset])
    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            'batch_id': r[0],
            'origin': r[1],
            'volume': r[2],
            'unit': r[3],
            'created_at': r[4],
            'current_stage': r[5],
            'status': r[6],
        }
        for r in rows
    ]

@app.get('/api/oil/batches/{batch_id}')
def get_batch(batch_id: str):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT batch_id, origin, volume, unit, created_at, current_stage, status, metadata FROM oil_batches WHERE batch_id = ?', (batch_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return {'error': 'not_found'}
    cur.execute('SELECT COUNT(1) FROM oil_events WHERE batch_id = ?', (batch_id,))
    event_count = cur.fetchone()[0]
    conn.close()
    return {
        'batch_id': row[0],
        'origin': row[1],
        'volume': row[2],
        'unit': row[3],
        'created_at': row[4],
        'current_stage': row[5],
        'status': row[6],
        'metadata': json.loads(row[7]) if row[7] else {},
        'event_count': event_count,
    }

@app.post('/api/oil/batches/{batch_id}/events')
def add_event(batch_id: str, payload: EventCreate):
    conn = get_conn()
    cur = conn.cursor()
    # Ensure batch exists
    cur.execute('SELECT batch_id FROM oil_batches WHERE batch_id = ?', (batch_id,))
    if not cur.fetchone():
        conn.close()
        return {'error': 'not_found', 'message': 'Batch does not exist'}
    ts = payload.ts or int(time.time())
    cur.execute(
        'INSERT INTO oil_events (batch_id, ts, stage, status, location_lat, location_lon, facility, notes, extra) VALUES (?,?,?,?,?,?,?,?,?)',
        (
            batch_id,
            ts,
            payload.stage,
            payload.status,
            payload.location_lat,
            payload.location_lon,
            payload.facility,
            payload.notes,
            json.dumps(payload.extra) if payload.extra is not None else None,
        )
    )
    # Update batch current stage/status
    cur.execute('UPDATE oil_batches SET current_stage = ?, status = ? WHERE batch_id = ?', (payload.stage, payload.status, batch_id))
    conn.commit()
    event_id = cur.lastrowid
    conn.close()
    return {'event_id': event_id, 'batch_id': batch_id, 'ts': ts}

@app.get('/api/oil/batches/{batch_id}/events')
def list_events(batch_id: str, ascending: bool = True, limit: Optional[int] = None, page: int = 1):
    conn = get_conn()
    cur = conn.cursor()
    order = 'ASC' if ascending else 'DESC'
    base = f'SELECT id, ts, stage, status, location_lat, location_lon, facility, notes, extra FROM oil_events WHERE batch_id = ? ORDER BY ts {order}'
    if limit is not None:
        if page < 1:
            page = 1
        if limit < 1:
            limit = 1
        offset = (page - 1) * limit
        base += ' LIMIT ? OFFSET ?'
        cur.execute(base, (batch_id, limit, offset))
    else:
        cur.execute(base, (batch_id,))
    rows = cur.fetchall()
    conn.close()
    return [
        {
            'id': r[0],
            'ts': r[1],
            'stage': r[2],
            'status': r[3],
            'location_lat': r[4],
            'location_lon': r[5],
            'facility': r[6],
            'notes': r[7],
            'extra': json.loads(r[8]) if r[8] else {},
        }
        for r in rows
    ]

@app.get('/api/oil/track/{batch_id}')
def track_summary(batch_id: str):
    """Return batch details, ordered events, and stage duration summary."""
    # Try cache
    key = cache_key('track_summary', {'batch_id': batch_id})
    cached = cache_get(key)
    if cached is not None:
        return cached
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT batch_id, origin, volume, unit, created_at, current_stage, status FROM oil_batches WHERE batch_id = ?', (batch_id,))
    batch = cur.fetchone()
    if not batch:
        conn.close()
        return {'error': 'not_found'}
    cur.execute('SELECT ts, stage FROM oil_events WHERE batch_id = ? ORDER BY ts ASC', (batch_id,))
    rows = cur.fetchall()
    # Compute stage durations
    durations = {}
    for i, (ts, stage) in enumerate(rows):
        next_ts = rows[i + 1][0] if i + 1 < len(rows) else int(time.time())
        durations[stage] = durations.get(stage, 0) + max(0, next_ts - ts)
    # Fetch full events for timeline
    cur.execute('SELECT id, ts, stage, status, location_lat, location_lon, facility, notes FROM oil_events WHERE batch_id = ? ORDER BY ts ASC', (batch_id,))
    events = [
        {
            'id': r[0], 'ts': r[1], 'stage': r[2], 'status': r[3], 'location_lat': r[4], 'location_lon': r[5], 'facility': r[6], 'notes': r[7]
        } for r in cur.fetchall()
    ]
    conn.close()
    result = {
        'batch': {
            'batch_id': batch[0], 'origin': batch[1], 'volume': batch[2], 'unit': batch[3], 'created_at': batch[4], 'current_stage': batch[5], 'status': batch[6]
        },
        'events': events,
        'durations_sec': durations
    }
    cache_set(key, result, ttl=60)
    return result

# Subscription endpoints
class SubscriptionCreate(BaseModel):
    user_id: str = Field(min_length=1, max_length=64)
    plan_id: int = Field(ge=1)
    duration_days: int = Field(ge=1, default=30)

@app.post('/api/subscription')
def create_subscription(payload: SubscriptionCreate):
    """Create or update a user subscription (demo endpoint - production uses blockchain)"""
    conn = get_conn()
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
    conn = get_conn()
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
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('UPDATE subscriptions SET is_active = 0 WHERE user_id = ?', (user_id,))
    conn.commit()
    count = cur.rowcount
    conn.close()
    return {'canceled': count > 0, 'user_id': user_id}
