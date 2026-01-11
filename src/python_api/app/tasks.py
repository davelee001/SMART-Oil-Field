import os
from pathlib import Path
import sqlite3
import time
import json
from typing import Optional
from celery import Celery

# Broker and backend (default to local Redis)
BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://127.0.0.1:6379/0')
RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', BROKER_URL)

celery_app = Celery('smart_oilfield', broker=BROKER_URL, backend=RESULT_BACKEND)
celery_app.conf.task_send_sent_event = True

DB = Path(__file__).resolve().parents[3] / 'data' / 'processed' / 'oilfield.db'

@celery_app.task(name='export_telemetry_csv')
def export_telemetry_csv(device_id: Optional[str] = None, ts_from: Optional[int] = None, ts_to: Optional[int] = None, limit: int = 1000):
    """Export telemetry to CSV as a string (for demo).
    In production, write to a file and return its path.
    """
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
    csv_content = "\n".join(lines)
    # include a tiny metadata blob
    meta = {
        'generated_at': int(time.time()),
        'count': len(rows),
        'filters': {
            'device_id': device_id,
            'ts_from': ts_from,
            'ts_to': ts_to,
            'limit': limit,
        }
    }
    return json.dumps({'meta': meta, 'csv': csv_content})
