import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// WebSocket proxy for real-time telemetry
wss.on('connection', (ws: WebSocket, req) => {
  if (req.url === '/ws/telemetry') {
    // Proxy WebSocket connection to Python API
    const pythonWsUrl = `ws://${PYTHON_API.replace('http://', '')}/ws/telemetry`;

    try {
      const pythonWs = new WebSocket(pythonWsUrl);

      pythonWs.on('open', () => {
        console.log('Connected to Python API WebSocket');
      });

      pythonWs.on('message', (data) => {
        // Forward messages from Python API to client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data.toString());
        }
      });

      pythonWs.on('close', () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      pythonWs.on('error', (error) => {
        console.error('Python API WebSocket error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });

      ws.on('message', (data) => {
        // Forward messages from client to Python API
        if (pythonWs.readyState === WebSocket.OPEN) {
          pythonWs.send(data.toString());
        }
      });

      ws.on('close', () => {
        pythonWs.close();
      });

      ws.on('error', (error) => {
        console.error('Client WebSocket error:', error);
        pythonWs.close();
      });

    } catch (error) {
      console.error('Failed to connect to Python API WebSocket:', error);
      ws.close();
    }
  } else {
    // Unknown WebSocket endpoint
    ws.close(1008, 'Unknown endpoint');
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'typescript-backend' });
});

// Proxy endpoints to Python API
app.get('/api/status', async (_req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/health`);
    const data = await response.json();
    res.json({
      typescript: 'ok',
      python: data.status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      typescript: 'ok',
      python: 'unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Gateway endpoint for telemetry - ingest data
app.post('/api/telemetry', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to ingest telemetry data' });
  }
});

// Gateway endpoint for telemetry - query
app.get('/api/telemetry', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/telemetry?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry data' });
  }
});

// Gateway endpoint for telemetry stats
app.get('/api/telemetry/stats', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/telemetry/stats?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry statistics' });
  }
});

// Gateway endpoint for telemetry export
app.get('/api/telemetry/export', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/telemetry/export?${queryParams}`);
    const text = await response.text();
    res.header('Content-Type', 'text/csv');
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export telemetry data' });
  }
});

// Gateway endpoint for subscription creation
app.post('/api/subscription', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Gateway endpoint for subscription status
app.get('/api/subscription/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const response = await fetch(`${PYTHON_API}/api/subscription/${userId}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription data' });
  }
});

// Oil tracker gateway - create batch
app.post('/api/oil/batches', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/oil/batches`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create batch' });
  }
});

// Oil tracker gateway - list batches
app.get('/api/oil/batches', async (req, res) => {
  try {
    const qs = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/oil/batches?${qs.toString()}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list batches' });
  }
});

// Oil tracker gateway - add event
app.post('/api/oil/batches/:batchId/events', async (req, res) => {
  try {
    const { batchId } = req.params;
    const response = await fetch(`${PYTHON_API}/api/oil/batches/${batchId}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add event' });
  }
});

// Oil tracker gateway - list events
app.get('/api/oil/batches/:batchId/events', async (req, res) => {
  try {
    const { batchId } = req.params;
    const qs = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/oil/batches/${batchId}/events?${qs.toString()}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list events' });
  }
});

// Gateway endpoint for ML anomaly prediction
app.post('/api/ml/predict', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/ml/predict`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to run anomaly detection' });
  }
});

// Gateway endpoint for anomaly configuration
app.post('/api/ml/config', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/ml/config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update anomaly config' });
  }
});

app.get('/api/ml/config', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/ml/config`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get anomaly config' });
  }
});

// Gateway endpoint for historical anomalies
app.get('/api/ml/anomalies', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/ml/anomalies?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anomaly data' });
  }
});

// Gateway endpoint for anomaly statistics
app.get('/api/ml/anomaly-stats', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/ml/anomaly-stats?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch anomaly statistics' });
  }
});

// Predictive analytics gateway endpoints
app.post('/api/predict/forecast', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/predict/forecast`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate forecast' });
  }
});

app.get('/api/predict/models', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/predict/models`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictive models' });
  }
});

app.post('/api/predict/train/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const response = await fetch(`${PYTHON_API}/api/predict/train/${deviceId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to train predictive models' });
  }
});

app.post('/api/predict/production', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/predict/production`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to forecast production' });
  }
});

// Alerting system gateway endpoints
app.post('/api/alerts/config', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/alerts/config`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update alert config' });
  }
});

app.get('/api/alerts/config', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/alerts/config`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get alert config' });
  }
});

app.post('/api/alerts/send', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/alerts/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send alert' });
  }
});

app.get('/api/alerts/test', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/alerts/test`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test alert system' });
  }
});

// Data aggregation gateway endpoints
app.get('/api/aggregation/telemetry', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/aggregation/telemetry?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate telemetry data' });
  }
});

app.get('/api/aggregation/anomalies', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/aggregation/anomalies?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to aggregate anomaly data' });
  }
});

// Historical trend analysis gateway endpoints
app.get('/api/trends/analysis', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/trends/analysis?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze trends' });
  }
});

app.get('/api/trends/compare', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/trends/compare?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to compare trends' });
  }
});

app.get('/api/trends/anomaly-trends', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/trends/anomaly-trends?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze anomaly trends' });
  }
});

// Batch data upload gateway endpoints
app.post('/api/upload/validate-csv', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/upload/validate-csv`, {
      method: 'POST',
      body: req.body // Forward the multipart data
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate CSV' });
  }
});

app.post('/api/upload/telemetry-csv', async (req, res) => {
  try {
    const response = await fetch(`${PYTHON_API}/api/upload/telemetry-csv`, {
      method: 'POST',
      body: req.body // Forward the multipart data
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to upload CSV' });
  }
});

app.get('/api/upload/history', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/upload/history?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get upload history' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
server.listen(port, () => console.log(`TS backend with WebSocket support listening on ${port}`));