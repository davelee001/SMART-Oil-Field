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

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => console.log(`TS backend listening on ${port}`));