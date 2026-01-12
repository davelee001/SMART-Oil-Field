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

# WebSocket connection manager for real-time telemetry
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.connection_lock = threading.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        with self.connection_lock:
            self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        with self.connection_lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast_telemetry(self, telemetry_data: dict):
        """Broadcast new telemetry data to all connected clients"""
        with self.connection_lock:
            connections = self.active_connections.copy()

        for connection in connections:
            try:
                await connection.send_json({
                    "type": "telemetry_update",
                    "data": telemetry_data,
                    "timestamp": int(time.time())
                })
            except Exception:
                # Connection might be dead, will be cleaned up on disconnect
                pass

manager = ConnectionManager()
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
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field
import uuid
import json
import hashlib
from app.tasks import celery_app, export_telemetry_csv
try:
    import redis as redis_lib
except Exception:
    redis_lib = None
try:
    import influxdb_client
    from influxdb_client.client.write_api import SYNCHRONOUS as INFLUX_SYNC
except Exception:
    influxdb_client = None
try:
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
except Exception:
    smtplib = None

try:
    import twilio
    from twilio.rest import Client as TwilioClient
except Exception:
    twilio = None
try:
    from prophet import Prophet
    import pandas as pd
    from sklearn.linear_model import LinearRegression
    from sklearn.preprocessing import StandardScaler
    from statsmodels.tsa.arima.model import ARIMA
except Exception:
    Prophet = None
    pd = None

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
    # Indexes for query performance
    conn.execute('CREATE INDEX IF NOT EXISTS idx_oil_events_batch_ts ON oil_events(batch_id, ts)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_tel_device_ts ON telemetry(device_id, ts)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_tel_ts ON telemetry(ts)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_batches_stage_status ON oil_batches(current_stage, status)')
    conn.execute('CREATE INDEX IF NOT EXISTS idx_batches_created_at ON oil_batches(created_at)')
    conn.commit()
    conn.close()

app = FastAPI(title='SMART Oilfield API', version='0.5.0')

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
    # Initialize InfluxDB (optional)
    global INFLUX_WRITE, INFLUX_BUCKET, INFLUX_ORG
    INFLUX_WRITE = None
    INFLUX_BUCKET = None
    INFLUX_ORG = None
    if influxdb_client is not None:
        url = os.environ.get('INFLUX_URL')
        token = os.environ.get('INFLUX_TOKEN')
        org = os.environ.get('INFLUX_ORG')
        bucket = os.environ.get('INFLUX_BUCKET')
        if url and token and org and bucket:
            try:
                client = influxdb_client.InfluxDBClient(url=url, token=token, org=org)
                INFLUX_WRITE = client.write_api(write_options=INFLUX_SYNC)
                INFLUX_BUCKET = bucket
                INFLUX_ORG = org
            except Exception:
                INFLUX_WRITE = None
                INFLUX_BUCKET = None
                INFLUX_ORG = None
    # Load ML model if available
    global ML_MODEL, MODEL_PATH
    ML_MODEL = None
    MODEL_PATH = (Path(__file__).resolve().parent / 'models' / 'telemetry_anomaly.pkl')
    if joblib is not None:
        try:
            if MODEL_PATH.exists():
                ML_MODEL = joblib.load(MODEL_PATH)
        except Exception:
            ML_MODEL = None

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

# WebSocket endpoint for real-time telemetry streaming
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and wait for client messages
            data = await websocket.receive_text()
            # For now, just echo back (could be used for subscription filters later)
            await websocket.send_json({
                "type": "echo",
                "message": f"Received: {data}",
                "timestamp": int(time.time())
            })
    except WebSocketDisconnect:
        manager.disconnect(websocket)


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

    # Real-time anomaly detection
    anomaly_result = ml_predict(MLPredictIn(
        temperature=payload.temperature,
        pressure=payload.pressure,
        device_id=payload.device_id,
        ts=payload.ts
    ))

    # Automatic threshold breach alerts
    if ALERT_CONFIG.alert_on_threshold_breach:
        alerts_sent = alert_manager.check_thresholds_and_alert(
            payload.device_id,
            payload.temperature,
            payload.pressure
        )
    else:
        alerts_sent = []

    # Broadcast to WebSocket clients
    telemetry_data = {
        'id': id_,
        'device_id': payload.device_id,
        'ts': payload.ts,
        'temperature': payload.temperature,
        'pressure': payload.pressure,
        'status': payload.status,
        'anomaly_detected': anomaly_result['anomaly'],
        'anomaly_score': anomaly_result['score'],
        'anomaly_reason': anomaly_result['reason'],
        'alerts_triggered': len(alerts_sent)
    }
    await manager.broadcast_telemetry(telemetry_data)

    # Write to InfluxDB (optional)
    try:
        if INFLUX_WRITE and INFLUX_BUCKET:
            point = influxdb_client.Point("telemetry")
            point = point.tag("device_id", payload.device_id)
            point = point.field("temperature", float(payload.temperature))
            point = point.field("pressure", float(payload.pressure))
            point = point.field("status", str(payload.status))
            point = point.field("anomaly_score", float(anomaly_result['score']))
            point = point.field("anomaly_detected", int(anomaly_result['anomaly']))
            point = point.time(datetime.utcfromtimestamp(int(payload.ts)))
            INFLUX_WRITE.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)
    except Exception:
        pass
    return {'id': id_, 'api_user': api_user, 'oauth2_token': oauth2_token, 'anomaly_check': anomaly_result}

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

@app.get('/api/telemetry/influx')
def telemetry_influx(device_id: Optional[str] = None, limit: int = 100):
    if influxdb_client is not None and INFLUX_BUCKET and INFLUX_ORG:
        try:
            client = influxdb_client.InfluxDBClient(url=os.environ.get('INFLUX_URL'), token=os.environ.get('INFLUX_TOKEN'), org=INFLUX_ORG)
            q = f'from(bucket: "{INFLUX_BUCKET}") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "telemetry")'
            if device_id:
                q += f' |> filter(fn: (r) => r.device_id == "{device_id}")'
            q += ' |> sort(columns: ["_time"], desc: true)'
            q += f' |> limit(n: {int(limit)})'
            res = client.query_api().query(org=INFLUX_ORG, query=q)
            tmp = {}
            for table in res:
                for record in table.records:
                    t = int(record.get_time().timestamp())
                    key = (record.values.get('device_id'), t)
                    row = tmp.get(key, {'device_id': record.values.get('device_id'), 'ts': t})
                    field = record.get_field()
                    row[field] = record.get_value()
                    tmp[key] = row
            out = sorted(tmp.values(), key=lambda r: r['ts'], reverse=True)
            return out
        except Exception:
            pass
    rows = list(device_id=device_id, limit=limit)
    return rows

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

@app.post('/api/telemetry/export/async')
def export_csv_async(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 1000):
    """Trigger async CSV export via Celery. Returns a task_id."""
    task = export_telemetry_csv.delay(device_id=device_id, ts_from=ts_from, ts_to=ts_to, limit=limit)
    return { 'task_id': task.id }

@app.get('/api/tasks/{task_id}')
def task_status(task_id: str):
    """Fetch Celery task status and (if ready) result."""
    res = celery_app.AsyncResult(task_id)
    result = None
    try:
        if res.ready():
            # JSON result from task; may be large
            result = res.get(timeout=1)
    except Exception:
        result = None
    return {
        'task_id': task_id,
        'state': res.state,
        'ready': res.ready(),
        'result': result,
    }

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

# ML Inference (Anomalies)
# -------------------------

class MLPredictIn(BaseModel):
    temperature: float
    pressure: float
    device_id: Optional[str] = None
    ts: Optional[int] = None

class AnomalyConfig(BaseModel):
    temperature_threshold: float = Field(default=95.0, ge=0)
    pressure_threshold: float = Field(default=260.0, ge=0)
    temperature_range: tuple[float, float] = Field(default=(60.0, 90.0))
    pressure_range: tuple[float, float] = Field(default=(180.0, 250.0))
    enable_ml_model: bool = Field(default=True)
    alert_on_anomaly: bool = Field(default=True)

# Global anomaly detection configuration
ANOMALY_CONFIG = AnomalyConfig()

@app.post('/api/ml/config')
def update_anomaly_config(config: AnomalyConfig):
    """Update anomaly detection configuration"""
    global ANOMALY_CONFIG
    ANOMALY_CONFIG = config
    return {"message": "Anomaly detection config updated", "config": config.dict()}

@app.get('/api/ml/config')
def get_anomaly_config():
    """Get current anomaly detection configuration"""
    return ANOMALY_CONFIG.dict()

def detect_anomaly_rule_based(temperature: float, pressure: float) -> tuple[bool, float, str]:
    """Rule-based anomaly detection with detailed reasoning"""
    score = 0.0
    reasons = []

    # Temperature checks
    if temperature > ANOMALY_CONFIG.temperature_threshold:
        score += 0.4
        reasons.append(f"Temperature {temperature}°C exceeds threshold {ANOMALY_CONFIG.temperature_threshold}°C")
    elif temperature < ANOMALY_CONFIG.temperature_range[0] or temperature > ANOMALY_CONFIG.temperature_range[1]:
        score += 0.2
        reasons.append(f"Temperature {temperature}°C outside normal range {ANOMALY_CONFIG.temperature_range}")

    # Pressure checks
    if pressure > ANOMALY_CONFIG.pressure_threshold:
        score += 0.4
        reasons.append(f"Pressure {pressure} PSI exceeds threshold {ANOMALY_CONFIG.pressure_threshold} PSI")
    elif pressure < ANOMALY_CONFIG.pressure_range[0] or pressure > ANOMALY_CONFIG.pressure_range[1]:
        score += 0.2
        reasons.append(f"Pressure {pressure} PSI outside normal range {ANOMALY_CONFIG.pressure_range}")

    # Cross-parameter analysis
    if temperature > 85.0 and pressure > 220.0:
        score += 0.3
        reasons.append("High temperature and pressure combination detected")

    # Calculate final anomaly decision
    is_anomaly = score >= 0.5
    reason_str = "; ".join(reasons) if reasons else "Within normal parameters"

    return is_anomaly, min(score, 1.0), reason_str

@app.post('/api/ml/predict')
def ml_predict(payload: MLPredictIn):
    score = None
    pred = None
    used = 'rule'
    reason = ""

    # Try ML model first if enabled
    if ANOMALY_CONFIG.enable_ml_model and ML_MODEL is not None:
        try:
            used = 'rf'
            proba = ML_MODEL.predict_proba([[float(payload.temperature), float(payload.pressure)]])
            score = float(proba[0][1])
            pred = bool(score >= 0.5)
            reason = f"ML model prediction with confidence {score:.3f}"
        except Exception:
            ML_MODEL = None

    # Fall back to rule-based detection
    if score is None:
        pred, score, reason = detect_anomaly_rule_based(payload.temperature, payload.pressure)
        used = 'rule'

    result = {
        'anomaly': pred,
        'score': score,
        'model': used,
        'reason': reason,
        'meta': {
            'device_id': payload.device_id,
            'ts': payload.ts
        }
    }

    # Broadcast anomaly alerts via WebSocket if anomaly detected and alerting enabled
    if pred and ANOMALY_CONFIG.alert_on_anomaly:
        alert_data = {
            'type': 'anomaly_alert',
            'device_id': payload.device_id,
            'temperature': payload.temperature,
            'pressure': payload.pressure,
            'score': score,
            'reason': reason,
            'timestamp': payload.ts or int(time.time())
        }
        # Run in background to not block response
        import asyncio
        asyncio.create_task(manager.broadcast_telemetry(alert_data))

@app.get('/api/ml/anomalies')
def get_anomalies(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 100):
    """Get historical anomaly data"""
    conn = get_conn()
    cur = conn.cursor()

    # This would require storing anomaly results in the database
    # For now, we'll simulate by re-running anomaly detection on recent telemetry
    q = '''
    SELECT id, device_id, ts, temperature, pressure, status
    FROM telemetry
    WHERE 1=1
    '''
    params = []
    if device_id:
        q += ' AND device_id = ?'
        params.append(device_id)
    if ts_from:
        q += ' AND ts >= ?'
        params.append(ts_from)
    if ts_to:
        q += ' AND ts <= ?'
        params.append(ts_to)
    q += ' ORDER BY ts DESC LIMIT ?'
    params.append(limit)

    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()

    anomalies = []
    for row in rows:
        id_, device_id_, ts_, temp, pressure, status = row
        anomaly_result = ml_predict(MLPredictIn(temperature=temp, pressure=pressure, device_id=device_id_, ts=ts_))
        if anomaly_result['anomaly']:
            anomalies.append({
                'id': id_,
                'device_id': device_id_,
                'ts': ts_,
                'temperature': temp,
                'pressure': pressure,
                'status': status,
                'anomaly_score': anomaly_result['score'],
                'anomaly_reason': anomaly_result['reason']
            })

    return {'anomalies': anomalies, 'total_found': len(anomalies)}

@app.get('/api/ml/anomaly-stats')
def get_anomaly_stats(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None):
    """Get anomaly statistics"""
    # Try cache
    key = cache_key('anomaly_stats', {'device_id': device_id, 'ts_from': ts_from, 'ts_to': ts_to})
    cached = cache_get(key)
    if cached:
        return cached

    conn = get_conn()
    cur = conn.cursor()

    q = 'SELECT COUNT(*) FROM telemetry WHERE 1=1'
    params = []
    if device_id:
        q += ' AND device_id = ?'
        params.append(device_id)
    if ts_from:
        q += ' AND ts >= ?'
        params.append(ts_from)
    if ts_to:
        q += ' AND ts <= ?'
        params.append(ts_to)

    cur.execute(q, tuple(params))
    total_readings = cur.fetchone()[0]

    # For anomaly count, we'd need to store results or recalculate
    # For demo purposes, estimate based on thresholds
    anomaly_estimate = int(total_readings * 0.05)  # Assume 5% anomalies

    conn.close()

    result = {
        'total_readings': total_readings,
        'estimated_anomalies': anomaly_estimate,
        'anomaly_rate': anomaly_estimate / max(total_readings, 1),
        'time_range': {'from': ts_from, 'to': ts_to},
        'device_filter': device_id
    }

    cache_set(key, result, ttl=300)  # Cache for 5 minutes
    return result

# -------------------------------
# Predictive Analytics (ML Models)
# -------------------------------

class ForecastRequest(BaseModel):
    device_id: str
    metric: str = Field(default='temperature', regex='^(temperature|pressure)$')
    hours_ahead: int = Field(default=24, ge=1, le=168)  # Max 1 week
    model: str = Field(default='prophet', regex='^(prophet|arima|linear)$')

class PredictiveModel:
    def __init__(self):
        self.models = {}
        self.scalers = {}

    def train_temperature_model(self, device_id: str):
        """Train predictive model for temperature forecasting"""
        if pd is None:
            return None

        conn = get_conn()
        cur = conn.cursor()
        # Get last 30 days of data
        thirty_days_ago = int(time.time()) - (30 * 24 * 60 * 60)
        cur.execute('''
            SELECT ts, temperature FROM telemetry
            WHERE device_id = ? AND ts >= ?
            ORDER BY ts ASC
        ''', (device_id, thirty_days_ago))

        rows = cur.fetchall()
        conn.close()

        if len(rows) < 24:  # Need at least 24 hours of data
            return None

        # Prepare data for Prophet
        df = pd.DataFrame(rows, columns=['ds', 'y'])
        df['ds'] = pd.to_datetime(df['ds'], unit='s')

        # Train Prophet model
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=True,
            changepoint_prior_scale=0.05
        )
        model.fit(df)

        model_key = f"{device_id}_temperature_prophet"
        self.models[model_key] = model
        return model

    def train_pressure_model(self, device_id: str):
        """Train predictive model for pressure forecasting"""
        if pd is None:
            return None

        conn = get_conn()
        cur = conn.cursor()
        thirty_days_ago = int(time.time()) - (30 * 24 * 60 * 60)
        cur.execute('''
            SELECT ts, pressure FROM telemetry
            WHERE device_id = ? AND ts >= ?
            ORDER BY ts ASC
        ''', (device_id, thirty_days_ago))

        rows = cur.fetchall()
        conn.close()

        if len(rows) < 24:
            return None

        df = pd.DataFrame(rows, columns=['ds', 'y'])
        df['ds'] = pd.to_datetime(df['ds'], unit='s')

        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=True,
            changepoint_prior_scale=0.05
        )
        model.fit(df)

        model_key = f"{device_id}_pressure_prophet"
        self.models[model_key] = model
        return model

    def forecast(self, device_id: str, metric: str, hours_ahead: int, model_type: str = 'prophet'):
        """Generate forecast for specified metric"""
        model_key = f"{device_id}_{metric}_{model_type}"

        # Train model if not exists
        if model_key not in self.models:
            if metric == 'temperature':
                self.train_temperature_model(device_id)
            elif metric == 'pressure':
                self.train_pressure_model(device_id)

        if model_key not in self.models:
            return None

        model = self.models[model_key]

        # Create future dataframe
        future = model.make_future_dataframe(periods=hours_ahead, freq='H')
        forecast = model.predict(future)

        # Return last N hours of forecast
        result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(hours_ahead)
        return result.to_dict('records')

# Global predictive model instance
predictive_model = PredictiveModel()

@app.post('/api/predict/forecast')
def forecast_telemetry(request: ForecastRequest):
    """Generate predictive forecast for telemetry metrics"""
    try:
        forecast_data = predictive_model.forecast(
            request.device_id,
            request.metric,
            request.hours_ahead,
            request.model
        )

        if forecast_data is None:
            return {
                'error': 'Insufficient data for forecasting',
                'message': f'Need at least 24 hours of {request.metric} data for device {request.device_id}'
            }

        return {
            'device_id': request.device_id,
            'metric': request.metric,
            'hours_ahead': request.hours_ahead,
            'model': request.model,
            'forecast': forecast_data,
            'generated_at': int(time.time())
        }
    except Exception as e:
        return {'error': 'Forecast generation failed', 'message': str(e)}

@app.get('/api/predict/models')
def list_predictive_models():
    """List available predictive models"""
    return {
        'available_models': ['prophet', 'arima', 'linear'],
        'supported_metrics': ['temperature', 'pressure'],
        'trained_models': list(predictive_model.models.keys())
    }

@app.post('/api/predict/train/{device_id}')
def train_device_models(device_id: str):
    """Train predictive models for a specific device"""
    results = {}

    # Train temperature model
    temp_model = predictive_model.train_temperature_model(device_id)
    results['temperature'] = 'trained' if temp_model else 'insufficient_data'

    # Train pressure model
    pressure_model = predictive_model.train_pressure_model(device_id)
    results['pressure'] = 'trained' if pressure_model else 'insufficient_data'

    return {
        'device_id': device_id,
        'training_results': results,
        'timestamp': int(time.time())
    }

class ProductionForecastRequest(BaseModel):
    batch_id: str
    days_ahead: int = Field(default=30, ge=1, le=365)

@app.post('/api/predict/production')
def forecast_production(request: ProductionForecastRequest):
    """Forecast oil production based on batch tracking data"""
    if pd is None:
        return {'error': 'Pandas not available for forecasting'}

    try:
        conn = get_conn()
        cur = conn.cursor()

        # Get batch events over time
        cur.execute('''
            SELECT ts, stage FROM oil_events
            WHERE batch_id = ?
            ORDER BY ts ASC
        ''', (request.batch_id,))

        events = cur.fetchall()
        conn.close()

        if len(events) < 5:
            return {'error': 'Insufficient event data for production forecasting'}

        # Simple linear regression based on stage progression
        df = pd.DataFrame(events, columns=['ts', 'stage'])
        df['ts'] = pd.to_datetime(df['ts'], unit='s')
        df['days_since_start'] = (df['ts'] - df['ts'].min()).dt.days

        # Stage progression scoring (simplified)
        stage_scores = {
            'DRILLING': 0.1,
            'EXTRACTION': 0.5,
            'REFINING': 0.8,
            'STORAGE': 0.9,
            'SHIPPING': 1.0
        }
        df['progress_score'] = df['stage'].map(stage_scores).fillna(0)

        # Fit linear model
        X = df[['days_since_start']]
        y = df['progress_score']

        model = LinearRegression()
        model.fit(X, y)

        # Forecast future progress
        future_days = pd.DataFrame({'days_since_start': range(df['days_since_start'].max() + 1, df['days_since_start'].max() + request.days_ahead + 1)})
        predictions = model.predict(future_days)

        forecast = []
        base_ts = df['ts'].max().timestamp()
        for i, pred in enumerate(predictions):
            forecast.append({
                'date': base_ts + (i + 1) * 24 * 60 * 60,
                'progress_score': min(max(pred, 0), 1),
                'estimated_completion': pred >= 0.95
            })

        return {
            'batch_id': request.batch_id,
            'days_ahead': request.days_ahead,
            'forecast': forecast,
            'model_accuracy': model.score(X, y),
            'generated_at': int(time.time())
        }
    except Exception as e:
        return {'error': 'Production forecast failed', 'message': str(e)}

# -------------------------------
# Alerting System (Email/SMS)
# -------------------------------

class AlertConfig(BaseModel):
    email_enabled: bool = Field(default=False)
    sms_enabled: bool = Field(default=False)
    email_smtp_server: str = Field(default="smtp.gmail.com")
    email_smtp_port: int = Field(default=587)
    email_username: str = Field(default="")
    email_password: str = Field(default="")
    email_from: str = Field(default="")
    email_recipients: list[str] = Field(default_factory=list)
    sms_twilio_sid: str = Field(default="")
    sms_twilio_token: str = Field(default="")
    sms_from_number: str = Field(default="")
    sms_recipients: list[str] = Field(default_factory=list)
    alert_on_anomaly: bool = Field(default=True)
    alert_on_threshold_breach: bool = Field(default=True)
    temperature_threshold_high: float = Field(default=95.0)
    temperature_threshold_low: float = Field(default=60.0)
    pressure_threshold_high: float = Field(default=260.0)
    pressure_threshold_low: float = Field(default=180.0)

class AlertRequest(BaseModel):
    type: str = Field(regex='^(anomaly|threshold|custom)$')
    title: str
    message: str
    device_id: Optional[str] = None
    severity: str = Field(default='medium', regex='^(low|medium|high|critical)$')
    metadata: Optional[dict] = None

# Global alert configuration
ALERT_CONFIG = AlertConfig()

class AlertManager:
    def __init__(self):
        self.email_client = None
        self.sms_client = None
        self._init_clients()

    def _init_clients(self):
        # Initialize email client
        if ALERT_CONFIG.email_enabled and smtplib:
            try:
                self.email_client = smtplib.SMTP(ALERT_CONFIG.email_smtp_server, ALERT_CONFIG.email_smtp_port)
                self.email_client.starttls()
                self.email_client.login(ALERT_CONFIG.email_username, ALERT_CONFIG.email_password)
            except Exception:
                self.email_client = None

        # Initialize SMS client
        if ALERT_CONFIG.sms_enabled and twilio:
            try:
                self.sms_client = TwilioClient(ALERT_CONFIG.sms_twilio_sid, ALERT_CONFIG.sms_twilio_token)
            except Exception:
                self.sms_client = None

    def send_email(self, subject: str, body: str, recipients: list[str] = None):
        """Send email alert"""
        if not self.email_client or not ALERT_CONFIG.email_enabled:
            return False

        recipients = recipients or ALERT_CONFIG.email_recipients
        if not recipients:
            return False

        try:
            msg = MIMEMultipart()
            msg['From'] = ALERT_CONFIG.email_from
            msg['To'] = ', '.join(recipients)
            msg['Subject'] = subject

            msg.attach(MIMEText(body, 'html'))

            self.email_client.sendmail(ALERT_CONFIG.email_from, recipients, msg.as_string())
            return True
        except Exception:
            return False

    def send_sms(self, message: str, recipients: list[str] = None):
        """Send SMS alert"""
        if not self.sms_client or not ALERT_CONFIG.sms_enabled:
            return False

        recipients = recipients or ALERT_CONFIG.sms_recipients
        if not recipients:
            return False

        try:
            for recipient in recipients:
                self.sms_client.messages.create(
                    body=message,
                    from_=ALERT_CONFIG.sms_from_number,
                    to=recipient
                )
            return True
        except Exception:
            return False

    def send_alert(self, alert: AlertRequest):
        """Send alert via configured channels"""
        subject = f"SMART Oilfield Alert: {alert.title}"
        body = f"""
        <h2>{alert.title}</h2>
        <p><strong>Type:</strong> {alert.type}</p>
        <p><strong>Severity:</strong> {alert.severity.upper()}</p>
        <p><strong>Device:</strong> {alert.device_id or 'N/A'}</p>
        <p><strong>Time:</strong> {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}</p>
        <p><strong>Message:</strong></p>
        <p>{alert.message}</p>
        """

        if alert.metadata:
            body += "<h3>Additional Details:</h3><ul>"
            for key, value in alert.metadata.items():
                body += f"<li><strong>{key}:</strong> {value}</li>"
            body += "</ul>"

        sms_message = f"ALERT: {alert.title} - {alert.message[:100]}{'...' if len(alert.message) > 100 else ''}"

        email_sent = self.send_email(subject, body)
        sms_sent = self.send_sms(sms_message)

        return {
            'email_sent': email_sent,
            'sms_sent': sms_sent,
            'alert': alert.dict()
        }

    def check_thresholds_and_alert(self, device_id: str, temperature: float, pressure: float):
        """Check thresholds and send alerts if breached"""
        alerts_sent = []

        # Temperature checks
        if temperature > ALERT_CONFIG.temperature_threshold_high:
            alert = AlertRequest(
                type='threshold',
                title='High Temperature Alert',
                message=f'Temperature {temperature}°C exceeds threshold {ALERT_CONFIG.temperature_threshold_high}°C',
                device_id=device_id,
                severity='high',
                metadata={'temperature': temperature, 'threshold': ALERT_CONFIG.temperature_threshold_high}
            )
            result = self.send_alert(alert)
            alerts_sent.append(result)

        elif temperature < ALERT_CONFIG.temperature_threshold_low:
            alert = AlertRequest(
                type='threshold',
                title='Low Temperature Alert',
                message=f'Temperature {temperature}°C below threshold {ALERT_CONFIG.temperature_threshold_low}°C',
                device_id=device_id,
                severity='medium',
                metadata={'temperature': temperature, 'threshold': ALERT_CONFIG.temperature_threshold_low}
            )
            result = self.send_alert(alert)
            alerts_sent.append(result)

        # Pressure checks
        if pressure > ALERT_CONFIG.pressure_threshold_high:
            alert = AlertRequest(
                type='threshold',
                title='High Pressure Alert',
                message=f'Pressure {pressure} PSI exceeds threshold {ALERT_CONFIG.pressure_threshold_high} PSI',
                device_id=device_id,
                severity='high',
                metadata={'pressure': pressure, 'threshold': ALERT_CONFIG.pressure_threshold_high}
            )
            result = self.send_alert(alert)
            alerts_sent.append(result)

        elif pressure < ALERT_CONFIG.pressure_threshold_low:
            alert = AlertRequest(
                type='threshold',
                title='Low Pressure Alert',
                message=f'Pressure {pressure} PSI below threshold {ALERT_CONFIG.pressure_threshold_low} PSI',
                device_id=device_id,
                severity='medium',
                metadata={'pressure': pressure, 'threshold': ALERT_CONFIG.pressure_threshold_low}
            )
            result = self.send_alert(alert)
            alerts_sent.append(result)

        return alerts_sent

# Global alert manager instance
alert_manager = AlertManager()

@app.post('/api/alerts/config')
def update_alert_config(config: AlertConfig):
    """Update alerting system configuration"""
    global ALERT_CONFIG, alert_manager
    ALERT_CONFIG = config
    alert_manager._init_clients()  # Reinitialize clients with new config
    return {"message": "Alert configuration updated", "config": config.dict()}

@app.get('/api/alerts/config')
def get_alert_config():
    """Get current alerting configuration"""
    return ALERT_CONFIG.dict()

@app.post('/api/alerts/send')
def send_custom_alert(alert: AlertRequest):
    """Send a custom alert"""
    result = alert_manager.send_alert(alert)
    return result

@app.get('/api/alerts/test')
def test_alert_system():
    """Test the alerting system configuration"""
    test_alert = AlertRequest(
        type='custom',
        title='Test Alert',
        message='This is a test alert to verify the alerting system is working correctly.',
        severity='low',
        metadata={'test_time': int(time.time())}
    )

    result = alert_manager.send_alert(test_alert)
    return {
        'test_result': result,
        'email_configured': ALERT_CONFIG.email_enabled and bool(alert_manager.email_client),
        'sms_configured': ALERT_CONFIG.sms_enabled and bool(alert_manager.sms_client)
    }

# -------------------------------
# Data Aggregation by Time Buckets
# -------------------------------

class AggregationRequest(BaseModel):
    device_id: Optional[str] = None
    bucket: str = Field(default='hour', regex='^(hour|day|week|month)$')
    ts_from: Optional[int] = None
    ts_to: Optional[int] = None
    metrics: list[str] = Field(default_factory=lambda: ['temperature', 'pressure'])

def get_bucket_start_ts(ts: int, bucket: str) -> int:
    """Get the start timestamp for the given bucket"""
    dt = datetime.fromtimestamp(ts)
    if bucket == 'hour':
        return int(datetime(dt.year, dt.month, dt.day, dt.hour).timestamp())
    elif bucket == 'day':
        return int(datetime(dt.year, dt.month, dt.day).timestamp())
    elif bucket == 'week':
        # Start of week (Monday)
        start_of_week = dt - timedelta(days=dt.weekday())
        return int(datetime(start_of_week.year, start_of_week.month, start_of_week.day).timestamp())
    elif bucket == 'month':
        return int(datetime(dt.year, dt.month, 1).timestamp())
    return ts

@app.get('/api/aggregation/telemetry')
def aggregate_telemetry(
    device_id: Optional[str] = None,
    bucket: str = 'hour',
    ts_from: Optional[int] = None,
    ts_to: Optional[int] = None,
    metrics: str = 'temperature,pressure'
):
    """Aggregate telemetry data by time buckets"""
    # Try cache
    cache_key_val = f"agg_{device_id or 'all'}_{bucket}_{ts_from}_{ts_to}_{metrics}"
    key = cache_key('telemetry_aggregation', {'key': cache_key_val})
    cached = cache_get(key)
    if cached:
        return cached

    metrics_list = [m.strip() for m in metrics.split(',') if m.strip()]

    conn = get_conn()
    cur = conn.cursor()

    # Build query
    q = '''
    SELECT
        ts,
        device_id,
        temperature,
        pressure,
        status
    FROM telemetry
    WHERE 1=1
    '''
    params = []

    if device_id:
        q += ' AND device_id = ?'
        params.append(device_id)

    if ts_from:
        q += ' AND ts >= ?'
        params.append(ts_from)

    if ts_to:
        q += ' AND ts <= ?'
        params.append(ts_to)

    q += ' ORDER BY ts ASC'

    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return {'aggregations': [], 'bucket': bucket, 'total_points': 0}

    # Group by bucket
    buckets = {}
    for row in rows:
        ts, dev_id, temp, pressure, status = row
        bucket_start = get_bucket_start_ts(ts, bucket)

        if bucket_start not in buckets:
            buckets[bucket_start] = {
                'bucket_start': bucket_start,
                'device_id': dev_id if device_id else 'all',
                'count': 0,
                'temperature': {'sum': 0, 'min': float('inf'), 'max': float('-inf'), 'count': 0},
                'pressure': {'sum': 0, 'min': float('inf'), 'max': float('-inf'), 'count': 0},
                'status_counts': {},
                'first_ts': ts,
                'last_ts': ts
            }

        bucket_data = buckets[bucket_start]
        bucket_data['count'] += 1
        bucket_data['last_ts'] = ts

        # Aggregate temperature
        if temp is not None and 'temperature' in metrics_list:
            bucket_data['temperature']['sum'] += temp
            bucket_data['temperature']['min'] = min(bucket_data['temperature']['min'], temp)
            bucket_data['temperature']['max'] = max(bucket_data['temperature']['max'], temp)
            bucket_data['temperature']['count'] += 1

        # Aggregate pressure
        if pressure is not None and 'pressure' in metrics_list:
            bucket_data['pressure']['sum'] += pressure
            bucket_data['pressure']['min'] = min(bucket_data['pressure']['min'], pressure)
            bucket_data['pressure']['max'] = max(bucket_data['pressure']['max'], pressure)
            bucket_data['pressure']['count'] += 1

        # Count status occurrences
        if status:
            bucket_data['status_counts'][status] = bucket_data['status_counts'].get(status, 0) + 1

    # Calculate averages and finalize
    aggregations = []
    for bucket_start, data in buckets.items():
        agg = {
            'bucket_start': bucket_start,
            'bucket_end': bucket_start + (
                3600 if bucket == 'hour' else
                86400 if bucket == 'day' else
                604800 if bucket == 'week' else
                2592000  # month approximation
            ),
            'device_id': data['device_id'],
            'count': data['count'],
            'duration_seconds': data['last_ts'] - data['first_ts'],
            'metrics': {}
        }

        # Finalize temperature metrics
        if data['temperature']['count'] > 0:
            agg['metrics']['temperature'] = {
                'avg': data['temperature']['sum'] / data['temperature']['count'],
                'min': data['temperature']['min'],
                'max': data['temperature']['max'],
                'count': data['temperature']['count']
            }

        # Finalize pressure metrics
        if data['pressure']['count'] > 0:
            agg['metrics']['pressure'] = {
                'avg': data['pressure']['sum'] / data['pressure']['count'],
                'min': data['pressure']['min'],
                'max': data['pressure']['max'],
                'count': data['pressure']['count']
            }

        agg['status_distribution'] = data['status_counts']
        aggregations.append(agg)

    # Sort by bucket start time
    aggregations.sort(key=lambda x: x['bucket_start'])

    result = {
        'aggregations': aggregations,
        'bucket': bucket,
        'total_points': len(rows),
        'total_buckets': len(aggregations),
        'metrics_included': metrics_list,
        'time_range': {'from': ts_from, 'to': ts_to}
    }

    cache_set(key, result, ttl=600)  # Cache for 10 minutes
    return result

@app.get('/api/aggregation/anomalies')
def aggregate_anomalies(
    device_id: Optional[str] = None,
    bucket: str = 'day',
    ts_from: Optional[int] = None,
    ts_to: Optional[int] = None
):
    """Aggregate anomaly data by time buckets"""
    # Try cache
    cache_key_val = f"agg_anom_{device_id or 'all'}_{bucket}_{ts_from}_{ts_to}"
    key = cache_key('anomaly_aggregation', {'key': cache_key_val})
    cached = cache_get(key)
    if cached:
        return cached

    conn = get_conn()
    cur = conn.cursor()

    # Get telemetry data and recalculate anomalies for aggregation
    q = 'SELECT ts, device_id, temperature, pressure FROM telemetry WHERE 1=1'
    params = []

    if device_id:
        q += ' AND device_id = ?'
        params.append(device_id)

    if ts_from:
        q += ' AND ts >= ?'
        params.append(ts_from)

    if ts_to:
        q += ' AND ts <= ?'
        params.append(ts_to)

    q += ' ORDER BY ts ASC'

    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        return {'anomaly_aggregations': [], 'bucket': bucket, 'total_points': 0}

    # Group by bucket and count anomalies
    buckets = {}
    for row in rows:
        ts, dev_id, temp, pressure = row
        bucket_start = get_bucket_start_ts(ts, bucket)

        if bucket_start not in buckets:
            buckets[bucket_start] = {
                'bucket_start': bucket_start,
                'device_id': dev_id if device_id else 'all',
                'total_readings': 0,
                'anomalies': 0,
                'anomaly_scores': [],
                'temperature_readings': 0,
                'pressure_readings': 0
            }

        bucket_data = buckets[bucket_start]
        bucket_data['total_readings'] += 1

        if temp is not None:
            bucket_data['temperature_readings'] += 1
        if pressure is not None:
            bucket_data['pressure_readings'] += 1

        # Check for anomaly
        anomaly_result = ml_predict(MLPredictIn(temperature=temp or 0, pressure=pressure or 0, device_id=dev_id, ts=ts))
        if anomaly_result['anomaly']:
            bucket_data['anomalies'] += 1
            bucket_data['anomaly_scores'].append(anomaly_result['score'])

    # Calculate anomaly rates
    aggregations = []
    for bucket_start, data in buckets.items():
        avg_score = sum(data['anomaly_scores']) / len(data['anomaly_scores']) if data['anomaly_scores'] else 0

        agg = {
            'bucket_start': bucket_start,
            'bucket_end': bucket_start + (
                3600 if bucket == 'hour' else
                86400 if bucket == 'day' else
                604800 if bucket == 'week' else
                2592000
            ),
            'device_id': data['device_id'],
            'total_readings': data['total_readings'],
            'anomalies': data['anomalies'],
            'anomaly_rate': data['anomalies'] / data['total_readings'] if data['total_readings'] > 0 else 0,
            'avg_anomaly_score': avg_score,
            'temperature_coverage': data['temperature_readings'] / data['total_readings'] if data['total_readings'] > 0 else 0,
            'pressure_coverage': data['pressure_readings'] / data['total_readings'] if data['total_readings'] > 0 else 0
        }
        aggregations.append(agg)

    # Sort by bucket start time
    aggregations.sort(key=lambda x: x['bucket_start'])

    result = {
        'anomaly_aggregations': aggregations,
        'bucket': bucket,
        'total_points': len(rows),
        'total_buckets': len(aggregations),
        'time_range': {'from': ts_from, 'to': ts_to}
    }

    cache_set(key, result, ttl=600)
    return result

# -------------------------------
# Historical Trend Analysis
# -------------------------------

class TrendAnalysisRequest(BaseModel):
    device_id: Optional[str] = None
    metric: str = Field(default='temperature', regex='^(temperature|pressure)$')
    ts_from: Optional[int] = None
    ts_to: Optional[int] = None
    analysis_type: str = Field(default='linear', regex='^(linear|seasonal|moving_average)$')
    window_size: int = Field(default=24, ge=2, le=168)  # hours

def calculate_linear_trend(values: list, timestamps: list) -> dict:
    """Calculate linear trend statistics"""
    if len(values) < 2:
        return {'slope': 0, 'intercept': 0, 'r_squared': 0, 'trend': 'insufficient_data'}

    # Convert timestamps to hours since start
    start_time = min(timestamps)
    x = [(t - start_time) / 3600 for t in timestamps]  # hours
    y = values

    # Calculate linear regression
    n = len(x)
    sum_x = sum(x)
    sum_y = sum(y)
    sum_xy = sum(xi * yi for xi, yi in zip(x, y))
    sum_x2 = sum(xi * xi for xi in x)

    slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
    intercept = (sum_y - slope * sum_x) / n

    # Calculate R-squared
    y_mean = sum_y / n
    ss_tot = sum((yi - y_mean) ** 2 for yi in y)
    ss_res = sum((yi - (slope * xi + intercept)) ** 2 for xi, yi in zip(x, y))
    r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

    # Determine trend direction
    if abs(slope) < 0.01:
        trend = 'stable'
    elif slope > 0:
        trend = 'increasing'
    else:
        trend = 'decreasing'

    return {
        'slope': slope,
        'intercept': intercept,
        'r_squared': r_squared,
        'trend': trend,
        'confidence': 'high' if r_squared > 0.7 else 'medium' if r_squared > 0.3 else 'low'
    }

def detect_seasonal_patterns(values: list, timestamps: list, period_hours: int = 24) -> dict:
    """Detect seasonal patterns in the data"""
    if len(values) < period_hours * 2:
        return {'seasonal': False, 'period_hours': period_hours, 'message': 'insufficient_data'}

    # Simple autocorrelation approach
    autocorr = []
    max_lag = min(len(values) // 4, period_hours * 2)

    for lag in range(1, max_lag + 1):
        corr = 0
        count = 0
        for i in range(len(values) - lag):
            corr += (values[i] - sum(values)/len(values)) * (values[i + lag] - sum(values)/len(values))
            count += 1
        autocorr.append(corr / count if count > 0 else 0)

    # Find peaks in autocorrelation
    peaks = []
    for i in range(1, len(autocorr) - 1):
        if autocorr[i] > autocorr[i-1] and autocorr[i] > autocorr[i+1] and autocorr[i] > 0.3:
            peaks.append((i, autocorr[i]))

    seasonal = len(peaks) > 0
    dominant_period = peaks[0][0] if peaks else None

    return {
        'seasonal': seasonal,
        'dominant_period_hours': dominant_period,
        'autocorrelation_peaks': peaks[:3],  # Top 3 peaks
        'period_hours': period_hours
    }

def calculate_moving_averages(values: list, timestamps: list, window_size: int) -> dict:
    """Calculate moving averages and identify trends"""
    if len(values) < window_size:
        return {'moving_averages': [], 'message': 'insufficient_data'}

    moving_avgs = []
    for i in range(len(values) - window_size + 1):
        window_values = values[i:i + window_size]
        avg = sum(window_values) / len(window_values)
        moving_avgs.append({
            'timestamp': timestamps[i + window_size - 1],
            'value': avg,
            'window_start': timestamps[i],
            'window_end': timestamps[i + window_size - 1]
        })

    # Calculate trend in moving averages
    if len(moving_avgs) >= 2:
        recent_avg = sum(ma['value'] for ma in moving_avgs[-min(5, len(moving_avgs)):]) / min(5, len(moving_avgs))
        earlier_avg = sum(ma['value'] for ma in moving_avgs[:min(5, len(moving_avgs))]) / min(5, len(moving_avgs))
        trend_direction = 'increasing' if recent_avg > earlier_avg * 1.05 else 'decreasing' if recent_avg < earlier_avg * 0.95 else 'stable'
    else:
        trend_direction = 'unknown'

    return {
        'moving_averages': moving_avgs,
        'window_size': window_size,
        'trend_direction': trend_direction,
        'volatility': calculate_volatility(values)
    }

def calculate_volatility(values: list) -> float:
    """Calculate volatility (coefficient of variation)"""
    if len(values) < 2:
        return 0

    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / len(values)
    std_dev = variance ** 0.5

    return std_dev / mean if mean != 0 else 0

@app.get('/api/trends/analysis')
def analyze_trends(
    device_id: Optional[str] = None,
    metric: str = 'temperature',
    ts_from: Optional[int] = None,
    ts_to: Optional[int] = None,
    analysis_type: str = 'linear',
    window_size: int = 24
):
    """Perform trend analysis on telemetry data"""
    # Try cache
    cache_key_val = f"trend_{device_id or 'all'}_{metric}_{analysis_type}_{ts_from}_{ts_to}_{window_size}"
    key = cache_key('trend_analysis', {'key': cache_key_val})
    cached = cache_get(key)
    if cached:
        return cached

    conn = get_conn()
    cur = conn.cursor()

    # Get data for analysis
    q = f'SELECT ts, {metric} FROM telemetry WHERE {metric} IS NOT NULL'
    params = []

    if device_id:
        q += ' AND device_id = ?'
        params.append(device_id)

    if ts_from:
        q += ' AND ts >= ?'
        params.append(ts_from)

    if ts_to:
        q += ' AND ts <= ?'
        params.append(ts_to)

    q += ' ORDER BY ts ASC'

    cur.execute(q, tuple(params))
    rows = cur.fetchall()
    conn.close()

    if len(rows) < 3:
        return {
            'error': 'insufficient_data',
            'message': f'Need at least 3 data points for trend analysis, got {len(rows)}',
            'device_id': device_id,
            'metric': metric
        }

    timestamps = [row[0] for row in rows]
    values = [row[1] for row in rows]

    result = {
        'device_id': device_id,
        'metric': metric,
        'data_points': len(values),
        'time_range': {
            'from': min(timestamps),
            'to': max(timestamps),
            'duration_hours': (max(timestamps) - min(timestamps)) / 3600
        },
        'analysis_type': analysis_type,
        'analysis': {}
    }

    # Perform requested analysis
    if analysis_type == 'linear':
        result['analysis'] = calculate_linear_trend(values, timestamps)
    elif analysis_type == 'seasonal':
        result['analysis'] = detect_seasonal_patterns(values, timestamps, window_size)
    elif analysis_type == 'moving_average':
        result['analysis'] = calculate_moving_averages(values, timestamps, window_size)

    # Add summary statistics
    result['summary_stats'] = {
        'mean': sum(values) / len(values),
        'median': sorted(values)[len(values) // 2],
        'min': min(values),
        'max': max(values),
        'volatility': calculate_volatility(values),
        'data_completeness': len([v for v in values if v is not None]) / len(values)
    }

    cache_set(key, result, ttl=1800)  # Cache for 30 minutes
    return result

@app.get('/api/trends/compare')
def compare_trends(
    device_ids: str,
    metric: str = 'temperature',
    ts_from: Optional[int] = None,
    ts_to: Optional[int] = None,
    bucket: str = 'day'
):
    """Compare trends across multiple devices"""
    device_list = [d.strip() for d in device_ids.split(',') if d.strip()]
    if len(device_list) < 2 or len(device_list) > 10:
        return {'error': 'invalid_device_count', 'message': 'Provide 2-10 device IDs separated by commas'}

    results = {}
    for device_id in device_list:
        try:
            analysis = analyze_trends(
                device_id=device_id,
                metric=metric,
                ts_from=ts_from,
                ts_to=ts_to,
                analysis_type='linear'
            )
            if 'error' not in analysis:
                results[device_id] = analysis
        except Exception:
            continue

    if not results:
        return {'error': 'no_valid_data', 'message': 'No valid trend data found for any devices'}

    # Compare trends
    comparison = {
        'devices_compared': list(results.keys()),
        'metric': metric,
        'time_range': ts_from and ts_to and {'from': ts_from, 'to': ts_to},
        'trend_summary': {}
    }

    for device_id, analysis in results.items():
        trend_info = analysis.get('analysis', {})
        comparison['trend_summary'][device_id] = {
            'trend': trend_info.get('trend', 'unknown'),
            'slope': trend_info.get('slope', 0),
            'confidence': trend_info.get('confidence', 'unknown'),
            'data_points': analysis.get('data_points', 0)
        }

    # Find best and worst performing devices
    if all('slope' in info for info in comparison['trend_summary'].values()):
        slopes = {d: info['slope'] for d, info in comparison['trend_summary'].items()}
        comparison['best_performer'] = max(slopes, key=slopes.get)
        comparison['worst_performer'] = min(slopes, key=slopes.get)

    return comparison

@app.get('/api/trends/anomaly-trends')
def analyze_anomaly_trends(
    device_id: Optional[str] = None,
    bucket: str = 'day',
    ts_from: Optional[int] = None,
    ts_to: Optional[int] = None
):
    """Analyze trends in anomaly occurrences"""
    # Get anomaly aggregations
    anomaly_data = aggregate_anomalies(
        device_id=device_id,
        bucket=bucket,
        ts_from=ts_from,
        ts_to=ts_to
    )

    if not anomaly_data.get('anomaly_aggregations'):
        return {'error': 'no_anomaly_data', 'message': 'No anomaly data available for trend analysis'}

    aggregations = anomaly_data['anomaly_aggregations']

    # Extract anomaly rates over time
    timestamps = [agg['bucket_start'] for agg in aggregations]
    anomaly_rates = [agg['anomaly_rate'] for agg in aggregations]

    # Calculate trend in anomaly rates
    trend_analysis = calculate_linear_trend(anomaly_rates, timestamps)

    # Calculate moving average of anomaly rates
    if len(anomaly_rates) >= 3:
        ma_window = min(7, len(anomaly_rates))  # 7-day moving average
        moving_avg = calculate_moving_averages(anomaly_rates, timestamps, ma_window)
    else:
        moving_avg = {'moving_averages': []}

    return {
        'device_id': device_id,
        'bucket': bucket,
        'time_range': {'from': ts_from, 'to': ts_to},
        'total_buckets': len(aggregations),
        'anomaly_trend': trend_analysis,
        'anomaly_moving_average': moving_avg,
        'anomaly_summary': {
            'avg_anomaly_rate': sum(anomaly_rates) / len(anomaly_rates),
            'max_anomaly_rate': max(anomaly_rates),
            'min_anomaly_rate': min(anomaly_rates),
            'total_anomalies': sum(agg['anomalies'] for agg in aggregations),
            'total_readings': sum(agg['total_readings'] for agg in aggregations)
        }
    }

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
