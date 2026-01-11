import sqlite3
from pathlib import Path
import os
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
import joblib

ROOT = Path(__file__).resolve().parents[1]
DB = ROOT / 'data' / 'processed' / 'oilfield.db'
MODEL_DIR = ROOT / 'src' / 'python_api' / 'app' / 'models'
MODEL_PATH = MODEL_DIR / 'telemetry_anomaly.pkl'

MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Load telemetry from SQLite
if not DB.exists():
    print(f"DB not found at {DB}, creating synthetic dataset...")
    df = pd.DataFrame()
else:
    conn = sqlite3.connect(DB)
    df = pd.read_sql_query('SELECT device_id, ts, temperature, pressure, status FROM telemetry', conn)
    conn.close()

if df.empty or len(df) < 100:
    # Create synthetic dataset
    n = 1000
    now = int(time.time())
    device_ids = [f"device-{i%5:03d}"] * n
    ts = np.arange(now - n, now)
    temperature = np.random.normal(80, 5, size=n)
    pressure = np.random.normal(200, 20, size=n)
    # Inject anomalies
    anomaly_idx = np.random.choice(n, size=int(0.1*n), replace=False)
    pressure[anomaly_idx] += np.random.normal(60, 15, size=len(anomaly_idx))
    temperature[anomaly_idx] += np.random.normal(15, 5, size=len(anomaly_idx))
    status = np.array(['OK']*n)
    status[anomaly_idx] = 'ALERT'
    df = pd.DataFrame({
        'device_id': device_ids,
        'ts': ts,
        'temperature': temperature,
        'pressure': pressure,
        'status': status
    })

# Engineer label: anomaly if status != OK, else derive via z-scores
if 'status' in df.columns:
    y = (df['status'] != 'OK').astype(int)
else:
    # Fallback: anomaly based on z-scores
    z_temp = (df['temperature'] - df['temperature'].mean()) / (df['temperature'].std() + 1e-6)
    z_press = (df['pressure'] - df['pressure'].mean()) / (df['pressure'].std() + 1e-6)
    y = ((z_temp.abs() > 2) | (z_press.abs() > 2)).astype(int)

X = df[['temperature', 'pressure']].copy()

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

clf = RandomForestClassifier(n_estimators=120, random_state=42, class_weight='balanced')
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)
print(classification_report(y_test, y_pred))

joblib.dump(clf, MODEL_PATH)
print(f"Saved model to {MODEL_PATH}")
