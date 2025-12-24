import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def run_tests():
    # Health
    r = client.get("/health")
    print("/health:", r.status_code, r.json())

    # Insert telemetry
    now_ts = int(time.time())
    payload = {
        "device_id": "well-005",
        "ts": now_ts,
        "temperature": 77.3,
        "pressure": 199.7,
        "status": "OK",
    }
    r = client.post("/api/telemetry", json=payload)
    print("POST /api/telemetry:", r.status_code, r.json())
    new_id = r.json().get("id")

    # List filtered
    r = client.get("/api/telemetry", params={"device_id": "well-005", "limit": 5})
    print("GET /api/telemetry:", r.status_code, r.json()[:1])

    # Get by id
    r = client.get(f"/api/telemetry/{new_id}")
    print("GET /api/telemetry/{id}:", r.status_code, r.json())

    # CSV export
    r = client.get("/api/telemetry/export", params={"device_id": "well-005", "limit": 5})
    print("GET /api/telemetry/export:\n", r.text)

    # Delete
    r = client.delete(f"/api/telemetry/{new_id}")
    print("DELETE /api/telemetry/{id}:", r.status_code, r.json())


if __name__ == "__main__":
    run_tests()
