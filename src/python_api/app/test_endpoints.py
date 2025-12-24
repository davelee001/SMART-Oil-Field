import time
from pathlib import Path

# Import endpoint functions directly from main.py in the same folder
from main import (
    TelemetryIn,
    ingest,
    list as list_telemetry,
    get_one,
    delete_one,
    export_csv,
    init_db,
    DB,
)


def run_tests():
    init_db()
    print(f"DB path: {DB}")

    now_ts = int(time.time())
    t = TelemetryIn(
        device_id="well-003",
        ts=now_ts,
        temperature=78.9,
        pressure=201.2,
        status="OK",
    )
    res = ingest(t)
    print("POST id:", res["id"])  # {'id': <int>}
    new_id = res["id"]

    rows = list_telemetry(device_id="well-003", limit=5)
    print("List count:", len(rows))
    if rows:
        print("List sample:", rows[0])

    one = get_one(new_id)
    print("Get one:", one)

    csv = export_csv(device_id="well-003", limit=10)
    print("CSV export:\n" + csv)

    deleted = delete_one(new_id)
    print("Deleted:", deleted)


if __name__ == "__main__":
    run_tests()
