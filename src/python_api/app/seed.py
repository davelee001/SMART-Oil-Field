from pathlib import Path
import sqlite3
DB = Path(__file__).resolve().parents[3] / 'data' / 'processed' / 'oilfield.db'
DB.parent.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(DB)
conn.execute('CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT, ts INTEGER, temperature REAL, pressure REAL, status TEXT)')
conn.execute('INSERT INTO telemetry (device_id, ts, temperature, pressure, status) VALUES (?, ?, ?, ?, ?)', ('well-001', 1735000000, 83.2, 210.5, 'OK'))
conn.commit()
print('Seeded one telemetry row')
conn.close()
