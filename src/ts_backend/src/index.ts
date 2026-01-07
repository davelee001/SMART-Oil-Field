import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Python API proxy configuration
const PYTHON_API = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';

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

// Gateway endpoint for telemetry
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

// Oil tracker gateway - track summary
app.get('/api/oil/track/:batchId', async (req, res) => {
  try {
    const { batchId } = req.params;
    const response = await fetch(`${PYTHON_API}/api/oil/track/${batchId}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch track summary' });
  }
});

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => console.log(`TS backend listening on ${port}`));