import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { body, validationResult } from 'express-validator';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { WebSocketManager, setupWebSocketEventHandlers } from './websocket/manager';
import { MessageQueueManager, QUEUES } from './queue/rabbitmq';
import { setupQueueHandlers, QueuePublisher } from './queue/handlers';
import { AptosEventListener } from './blockchain/aptos-listener';
import { CacheManager, cacheMiddleware } from './cache/redis';
import { setupCacheInvalidationHandlers, CacheInvalidator } from './cache/invalidation';
import { APIGateway, createRouteRateLimiter } from './gateway/proxy';

// Load environment variables
dotenv.config();

// Environment configuration
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
const APTOS_RPC_URL = process.env.APTOS_RPC_URL || 'https://fullnode.devnet.aptoslabs.com/v1';
const APTOS_MODULE_ADDRESS = process.env.APTOS_MODULE_ADDRESS || '0x1';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: any, _res, next) => {
  req.id = uuidv4();
  next();
});

// Request logging with morgan
app.use(morgan('combined', {
  format: ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'
}));

// Validation middleware helper
const handleValidation = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation Error',
      details: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Global error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${(req as any).id}] Error in ${req.method} ${req.url}:`, error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
    requestId: (req as any).id
  });
});

// Initialize WebSocket Manager
const wsManager = new WebSocketManager(wss);
setupWebSocketEventHandlers(wsManager);

// Initialize Cache Manager
const cacheManager = new CacheManager({
  url: REDIS_URL,
  defaultTTL: 600, // 10 minutes default
});

// Initialize API Gateway
const apiGateway = new APIGateway(app, cacheManager);

// Register proxy routes to Python API with caching
apiGateway.register('/api/v1/oil-movements', {
  target: PYTHON_API,
  pathRewrite: { '^/api/v1': '/api' },
  changeOrigin: true,
  timeout: 10000,
  retries: 2,
  cache: { enabled: true, ttl: 300 }, // 5 minutes cache
});

apiGateway.register('/api/v1/subscriptions', {
  target: PYTHON_API,
  pathRewrite: { '^/api/v1': '/api' },
  changeOrigin: true,
  timeout: 10000,
  retries: 2,
  cache: { enabled: true, ttl: 300 },
});

apiGateway.register('/api/v1/stats', {
  target: PYTHON_API,
  pathRewrite: { '^/api/v1': '/api' },
  changeOrigin: true,
  timeout: 5000,
  retries: 1,
  cache: { enabled: true, ttl: 60 }, // 1 minute cache for stats
});

// Connect to Redis
cacheManager.connect().then(() => {
  console.log('✅ Redis cache connected');
}).catch((error) => {
  console.error('❌ Failed to connect to Redis:', error);
});

// Initialize Message Queue Manager
const queueManager = new MessageQueueManager({
  url: RABBITMQ_URL,
  queues: Object.values(QUEUES),
});

// Connect to RabbitMQ and setup handlers
queueManager.connect().then(() => {
  setupQueueHandlers(queueManager, wsManager);
  setupCacheInvalidationHandlers(cacheManager, queueManager);
  console.log('✅ Message queue connected and handlers configured');
}).catch((error) => {
  console.error('❌ Failed to connect to message queue:', error);
});

// Create queue publisher for easy publishing
const queuePublisher = new QueuePublisher(queueManager);

// Initialize Aptos Blockchain Event Listener
const aptosListener = new AptosEventListener(
  {
    rpcUrl: APTOS_RPC_URL,
    moduleAddress: APTOS_MODULE_ADDRESS,
    pollInterval: 15000, // Poll every 15 seconds
  },
  queuePublisher
);

// Start blockchain listener
aptosListener.start().then(() => {
  console.log('✅ Aptos blockchain event listener started');
}).catch((error) => {
  console.error('❌ Failed to start blockchain listener:', error);
});

// Add WebSocket stats endpoint
app.get('/api/ws/stats', (req, res) => {
  res.json(wsManager.getStats());
});

// Add queue stats endpoint
app.get('/api/queue/stats', (req, res) => {
  res.json({
    connected: queueManager.isConnected(),
    url: RABBITMQ_URL.replace(/\/\/.*@/, '//<credentials>@'), // Hide credentials
  });
});

// Add blockchain stats endpoint
app.get('/api/blockchain/stats', (req, res) => {
  res.json(aptosListener.getStats());
});

// Add cache stats endpoint
app.get('/api/cache/stats', async (req, res) => {
  const stats = await cacheManager.getStats();
  res.json(stats);
});

// Add cache invalidation endpoints (for admin use)
app.post('/api/cache/invalidate/all', async (req, res) => {
  const invalidator = new CacheInvalidator(cacheManager);
  await invalidator.invalidateAll();
  res.json({ message: 'All caches invalidated' });
});

app.post('/api/cache/invalidate/oil-movements', async (req, res) => {
  const invalidator = new CacheInvalidator(cacheManager);
  await invalidator.invalidateAllOilMovements();
  res.json({ message: 'Oil movement caches invalidated' });
});

app.post('/api/cache/invalidate/subscriptions', async (req, res) => {
  const invalidator = new CacheInvalidator(cacheManager);
  await invalidator.invalidateAllSubscriptions();
  res.json({ message: 'Subscription caches invalidated' });
});

// Apply caching middleware to specific routes (with shorter TTL for dynamic data)
app.use('/api/stats', cacheMiddleware(cacheManager, 60)); // 1 minute cache for stats
app.use('/api/oil-movements', cacheMiddleware(cacheManager, 300)); // 5 minutes cache

// Add gateway stats endpoint
app.get('/api/gateway/stats', (req, res) => {
  res.json(apiGateway.getStats());
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      cache: cacheManager.getConnectionStatus(),
      queue: queueManager.isConnected(),
      blockchain: aptosListener.getStats().isRunning,
    },
  });
});

// Legacy WebSocket proxy for real-time telemetry (keeping for backward compatibility)
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

// Audit logging endpoints
app.get('/api/audit/logs', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/audit/logs?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

app.get('/api/audit/logs/:logId', async (req, res) => {
  try {
    const { logId } = req.params;
    const response = await fetch(`${PYTHON_API}/api/audit/logs/${logId}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audit log' });
  }
});

app.get('/api/audit/stats', async (req, res) => {
  try {
    const queryParams = new URLSearchParams(req.query as Record<string, string>);
    const response = await fetch(`${PYTHON_API}/api/audit/stats?${queryParams}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get audit stats' });
  }
});

// Initialize Apollo Server for GraphQL
async function startApolloServer() {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }: any) => {
      return {
        requestId: req.id,
        user: req.user, // Add authentication user if available
      };
    },
    formatError: (error) => {
      console.error('GraphQL Error:', error);
      return error;
    },
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV !== 'production',
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    path: '/graphql',
    cors: false // Using app-level CORS
  });

  console.log(`GraphQL endpoint available at /graphql`);
}

// Start server
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

startApolloServer().then(() => {
  server.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║          🚀 TypeScript Backend Server Started              ║
╠════════════════════════════════════════════════════════════╣
║  Port:              ${port}                                    ║
║  GraphQL:           http://localhost:${port}/graphql        ║
║  Health Check:      http://localhost:${port}/health         ║
╠════════════════════════════════════════════════════════════╣
║  📊 Services Status:                                       ║
║  ✅ Express API      Ready                                 ║
║  ✅ GraphQL          Ready                                 ║
║  🔌 WebSocket        Ready                                 ║
║  🐰 RabbitMQ         ${queueManager.isConnected() ? 'Connected   ' : 'Connecting...'}                         ║
║  💾 Redis Cache      ${cacheManager.getConnectionStatus() ? 'Connected   ' : 'Connecting...'}                         ║
║  ⛓️  Blockchain       ${aptosListener.getStats().isRunning ? 'Listening   ' : 'Starting...  '}                         ║
║  🚪 API Gateway      Ready (${apiGateway.getStats().totalRoutes} routes)                       ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
}).catch((error) => {
  console.error('Failed to start Apollo Server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await aptosListener.stop();
  await queueManager.close();
  await cacheManager.disconnect();
  wsManager.cleanup();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await aptosListener.stop();
  await queueManager.close();
  await cacheManager.disconnect();
  wsManager.cleanup();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});