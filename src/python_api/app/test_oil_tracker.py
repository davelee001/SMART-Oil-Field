import time
from fastapi.testclient import TestClient
from main import app, init_db

client = TestClient(app)

def run_tests():
    init_db()
    # Create batch
    r = client.post('/api/oil/batches', json={
        'origin': 'well-TEST',
        'volume': 500.0,
        'unit': 'bbl'
    })
    assert r.status_code == 200, r.text
    batch = r.json()
    batch_id = batch['batch_id']
    print('Created batch:', batch_id)

    # Add events
    stages = ['DRILLING', 'EXTRACTION', 'STORAGE', 'TRANSPORT']
    ts = int(time.time()) - 1000
    for i, stage in enumerate(stages):
        r = client.post(f'/api/oil/batches/{batch_id}/events', json={
            'ts': ts + i * 100,
            'stage': stage,
            'status': 'COMPLETED' if i < len(stages)-1 else 'IN_PROGRESS',
            'facility': f'Facility-{i}',
            'notes': f'{stage} note'
        })
        assert r.status_code == 200, r.text

    # Get timeline
    r = client.get(f'/api/oil/track/{batch_id}')
    assert r.status_code == 200
    data = r.json()
    print('Timeline events:', len(data['events']))
    print('Durations:', data['durations_sec'])

if __name__ == '__main__':
    run_tests()
