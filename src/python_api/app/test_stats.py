import time
from pathlib import Path
from main import TelemetryIn, ingest, stats, init_db, DB


def run_tests():
    init_db()
    # Insert a few samples for a test device
    now = int(time.time())
    for i in range(3):
        payload = TelemetryIn(
            device_id="well-STAT",
            ts=now + i,
            temperature=75.0 + i,
            pressure=200.0 + i * 2,
            status="OK" if i < 2 else "WARN",
        )
        ingest(payload)

    # Query stats
    s = stats(device_id="well-STAT")
    print("Stats:", s)


if __name__ == "__main__":
    run_tests()
