from pathlib import Path
import sqlite3
DB = Path(__file__).resolve().parents[3] / 'data' / 'processed' / 'oilfield.db'
DB.parent.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(DB)
conn.execute('CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, device_id TEXT, ts INTEGER, temperature REAL, pressure REAL, status TEXT)')
conn.execute('INSERT INTO telemetry (device_id, ts, temperature, pressure, status) VALUES (?, ?, ?, ?, ?)', ('well-001', 1735000000, 83.2, 210.5, 'OK'))
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
import time, json
now = int(time.time())
# Seed one oil batch and a few events
conn.execute('INSERT OR REPLACE INTO oil_batches (batch_id, origin, volume, unit, created_at, current_stage, status, metadata) VALUES (?,?,?,?,?,?,?,?)',
			 ('BATCH-DEMO1', 'well-001', 1200.0, 'bbl', now-7200, 'TRANSPORT', 'IN_PROGRESS', json.dumps({'api':'seed'})))
events = [
	('BATCH-DEMO1', now-7000, 'DRILLING', 'COMPLETED', None, None, 'Well Pad', 'Drilling complete', None),
	('BATCH-DEMO1', now-6500, 'EXTRACTION', 'COMPLETED', None, None, 'Well Pad', 'Extracted and ready', None),
	('BATCH-DEMO1', now-5000, 'STORAGE', 'COMPLETED', None, None, 'Tank Farm A', 'Temporary storage', None),
	('BATCH-DEMO1', now-2000, 'TRANSPORT', 'IN_PROGRESS', 29.7604, -95.3698, 'Truck #12', 'En route to refinery', None),
]
conn.executemany('INSERT INTO oil_events (batch_id, ts, stage, status, location_lat, location_lon, facility, notes, extra) VALUES (?,?,?,?,?,?,?,?,?)', events)
conn.commit()
print('Seeded telemetry and oil tracker demo data')
conn.close()
