# TypeScript Backend - Oil Tracker System

Enterprise-grade TypeScript backend server providing API gateway, GraphQL, WebSocket, message queue integration, blockchain event monitoring, and intelligent caching for the Oil Tracker application.

## Features

### 1. Full Express.js API Implementation
- RESTful API endpoints with comprehensive routing
- Request validation using express-validator
- Rate limiting (100 requests per 15 minutes per IP)
- Security middleware (Helmet, CORS)
- Error handling and request logging (Morgan)
- Request ID tracking for debugging
- JSON body parsing with 10MB limit
- Global error handler with dev/production modes

### 2. GraphQL Endpoint
- Apollo Server v3 integration
- Complete schema with 10+ queries and 6+ mutations
- Real-time GraphQL subscriptions via PubSub
- Optimized resolvers with Python API integration
- GraphQL Playground (development mode only)
- Context management with request tracking
- Introspection enabled in development

### 3. WebSocket Server for Real-time Updates
- Advanced WebSocket manager with connection pooling
- Topic-based subscriptions system
  - `oil-movements` - Oil movement events
  - `subscriptions` - Subscription events
  - `blockchain` - Blockchain events
  - `analytics` - Analytics updates
- Heartbeat mechanism (ping/pong every 30s)
- Automatic cleanup of stale connections (60s timeout)
- Event broadcasting to subscribed clients
- Integration with GraphQL PubSub system
- Connection statistics endpoint

### 4. Message Queue Integration (RabbitMQ)
- Robust RabbitMQ client with auto-reconnect
- Topic-based exchange (`oil-tracker-exchange`)
- Event-driven architecture with 5 queues:
  - `oil-movements` - Oil movement events
  - `subscriptions` - Subscription events
  - `notifications` - Notification events
  - `blockchain-events` - Blockchain events
  - `analytics` - Analytics events
- Message acknowledgment and requeuing
- Graceful error handling
- QueuePublisher helper class for easy publishing

### 5. Blockchain Event Listener (Aptos)
- Real-time monitoring of Aptos blockchain events
- Automatic polling every 15 seconds
- Sequence number tracking (prevents duplicates)
- Event processing for oil movements and subscriptions
- Integration with message queue for distribution
- Transaction and resource query helpers
- Configurable RPC endpoint and module address

### 6. Cache Invalidation Strategy (Redis)
- Redis v4 client with connection management
- Pattern-based cache invalidation
- Event-driven invalidation via message queue
- TTL management per data type:
  - Oil movements: 5 minutes
  - Subscriptions: 5 minutes
  - Statistics: 1 minute
  - Gateway proxy: Configurable per route
- Cache warming strategies
- Express middleware for automatic caching
- Manual invalidation endpoints for admin
- Cache statistics endpoint

### 7. API Gateway/Reverse Proxy
- Intelligent request routing and proxying
- Path rewriting capabilities
- Request/response caching at gateway level
- Retry logic with exponential backoff (max 5s delay)
- Circuit breaker pattern for service resilience
- Header forwarding and manipulation
- Per-route configuration:
  - Target URL
  - Timeout settings
  - Retry count
  - Cache TTL
- Registered routes:
  - `/api/v1/oil-movements` → Python API (cached 5min)
  - `/api/v1/subscriptions` → Python API (cached 5min)
  - `/api/v1/stats` → Python API (cached 1min)

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

### Environment Variables

Create a `.env` file from the template:
```bash
cp .env.example .env
```

**Required Variables:**

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3000` | `3000` |
| `NODE_ENV` | Environment | `development` | `production` |
| `FRONTEND_ORIGIN` | CORS origin | `*` | `http://localhost:3001` |
| `PYTHON_API_URL` | Python API endpoint | `http://localhost:8000` | `http://localhost:8000` |
| `APTOS_RPC_URL` | Aptos blockchain RPC | `https://fullnode.devnet.aptoslabs.com/v1` | - |
| `APTOS_MODULE_ADDRESS` | Smart contract address | `0x1` | `0xYourModuleAddress` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379` | `redis://user:pass@host:6379` |
| `RABBITMQ_URL` | RabbitMQ connection URL | `amqp://localhost:5672` | `amqp://user:pass@host:5672` |

## Running

### Development Mode
```bash
npm run dev
```
Runs with hot-reload using `ts-node-dev`

### Production Build
```bash
npm run build    # Compile TypeScript
npm start        # Run compiled JavaScript
```

## Project Structure

```
src/
├── blockchain/
│   └── aptos-listener.ts      # Aptos blockchain event listener
├── cache/
│   ├── redis.ts               # Redis cache manager
│   └── invalidation.ts        # Cache invalidation logic
├── gateway/
│   └── proxy.ts               # API Gateway & reverse proxy
├── graphql/
│   ├── schema.ts              # GraphQL type definitions
│   └── resolvers.ts           # GraphQL resolvers
├── queue/
│   ├── rabbitmq.ts            # RabbitMQ client
│   └── handlers.ts            # Message queue event handlers
├── websocket/
│   └── manager.ts             # WebSocket connection manager
└── index.ts                   # Main application entry point
```

## API Endpoints

### Health & Monitoring
- `GET /health` - Overall health check with service status
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-01-18T...",
    "uptime": 12345.67,
    "services": {
      "cache": true,
      "queue": true,
      "blockchain": true
    }
  }
  ```

- `GET /api/ws/stats` - WebSocket connection statistics
- `GET /api/queue/stats` - RabbitMQ connection status
- `GET /api/blockchain/stats` - Blockchain listener statistics  
- `GET /api/cache/stats` - Redis cache statistics and metrics
- `GET /api/gateway/stats` - API Gateway route statistics

### GraphQL
- `POST /graphql` - GraphQL endpoint
- `GET /graphql` - GraphQL Playground (development only)

**Example Queries:**
```graphql
# Get oil movements
query {
  listOilMovements(limit: 10, offset: 0, status: "pending") {
    items {
      id
      source
      destination
      quantity
      status
    }
    total
    hasMore
  }
}

# Create oil movement
mutation {
  createOilMovement(input: {
    source: "Refinery A"
    destination: "Terminal B"
    quantity: 5000
    movementType: "transfer"
  }) {
    id
    status
    timestamp
  }
}

# Subscribe to updates
subscription {
  oilMovementCreated {
    id
    source
    destination
    quantity
  }
}
```

### Cache Management (Admin)
- `POST /api/cache/invalidate/all` - Clear all caches
- `POST /api/cache/invalidate/oil-movements` - Clear oil movement caches
- `POST /api/cache/invalidate/subscriptions` - Clear subscription caches

### Proxied Routes (via API Gateway)
All requests are proxied to Python API with caching:
- `/api/v1/oil-movements/*` - Oil movement operations (5min cache)
- `/api/v1/subscriptions/*` - Subscription operations (5min cache)
- `/api/v1/stats/*` - Statistics (1min cache)

### WebSocket

**Connect:** `ws://localhost:3000`

**Subscribe to Topic:**
```json
{
  "type": "subscribe",
  "topic": "oil-movements"
}
```

**Available Topics:**
- `oil-movements` - Oil movement create/update/status events
- `subscriptions` - Subscription events
- `blockchain` - Blockchain transaction events
- `analytics` - Analytics and metrics updates

**Unsubscribe:**
```json
{
  "type": "unsubscribe",
  "topic": "oil-movements"
}
```

**Ping/Pong:**
```json
{
  "type": "ping"
}
```

**Get Subscriptions:**
```json
{
  "type": "request",
  "action": "getSubscriptions"
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│             TypeScript Backend Server                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Express API  │  │   GraphQL    │  │  WebSocket   │ │
│  │   Gateway    │  │   Server     │  │   Manager    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
│         └─────────────────┴──────────────────┘          │
│                           │                             │
│  ┌────────────────────────┴──────────────────────────┐ │
│  │          Middleware & Integration Layer           │ │
│  ├───────────────────────────────────────────────────┤ │
│  │  • Request Validation  • Rate Limiting            │ │
│  │  • Error Handling      • Security (Helmet)        │ │
│  │  • Logging (Morgan)    • CORS                     │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Redis Cache  │  │   RabbitMQ   │  │    Aptos     │ │
│  │   Manager    │  │    Client    │  │   Listener   │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                 │                  │          │
└─────────┼─────────────────┼──────────────────┼──────────┘
          │                 │                  │
          ▼                 ▼                  ▼
    ┌─────────┐       ┌─────────┐       ┌──────────┐
    │  Redis  │       │RabbitMQ │       │  Aptos   │
    │  Server │       │  Broker │       │   RPC    │
    └─────────┘       └─────────┘       └──────────┘
          │                 │                  │
          └─────────────────┴──────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │   Python API    │
                  └─────────────────┘
```

## Data Flow

### Oil Movement Creation Flow
1. Client sends GraphQL mutation or REST request
2. Express/Apollo validates request
3. Request proxied to Python API
4. Python API creates record in database
5. Python API publishes event to RabbitMQ
6. TypeScript backend receives event
7. Cache invalidated for oil movements
8. Event broadcast via WebSocket to subscribed clients
9. GraphQL subscription sends update to subscribed clients

### Blockchain Event Flow
1. Aptos Listener polls blockchain every 15 seconds
2. New events detected and processed
3. Events published to `blockchain-events` queue
4. Queue handler receives event
5. Event broadcast via WebSocket
6. Related caches invalidated

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "ws": "^8.18.0",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^7.1.5",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1",
    "uuid": "^9.0.1",
    "express-validator": "^7.0.1",
    "apollo-server-express": "^3.13.0",
    "graphql": "^16.8.1",
    "graphql-subscriptions": "^2.0.0",
    "axios": "^1.6.2",
    "amqplib": "^0.10.3",
    "redis": "^4.6.11"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.7.5",
    "@types/ws": "^8.5.12",
    "@types/morgan": "^1.9.9",
    "@types/cors": "^2.8.17",
    "@types/compression": "^1.7.5",
    "@types/uuid": "^9.0.7",
    "@types/amqplib": "^0.10.4",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.6.3"
  }
}
```

## Development

### Prerequisites
- Node.js 18+ and npm
- Redis server running on localhost:6379
- RabbitMQ server running on localhost:5672
- Python API running on localhost:8000 (optional for full functionality)

### Local Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Start Supporting Services**
   ```bash
   # Start Redis (if not running)
   redis-server
   
   # Start RabbitMQ (if not running)
   rabbitmq-server
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Access Services**
   - HTTP API: http://localhost:3000
   - GraphQL Playground: http://localhost:3000/graphql
   - Health Check: http://localhost:3000/health

### Testing

**Test GraphQL:**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ health { status timestamp } }"}'
```

**Test WebSocket:**
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', topic: 'oil-movements' }));
};
ws.onmessage = (event) => console.log(event.data);
```

**Test Cache:**
```bash
curl http://localhost:3000/api/cache/stats
```

## Troubleshooting

### Redis Connection Failed
- Ensure Redis is running: `redis-cli ping` should return `PONG`
- Check REDIS_URL in .env file
- Verify Redis is accepting connections: `redis-cli info`

### RabbitMQ Connection Failed
- Ensure RabbitMQ is running: `rabbitmqctl status`
- Check RABBITMQ_URL in .env file
- Verify management plugin: http://localhost:15672

### Blockchain Listener Not Working
- Verify APTOS_RPC_URL is accessible
- Check APTOS_MODULE_ADDRESS is correct
- Review logs for event polling errors

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process (Windows)
taskkill /PID <PID> /F
```

## Performance

### Caching Strategy
- API responses cached at multiple levels
- Redis for persistent cache
- In-memory cache for frequently accessed data
- Automatic invalidation on data changes

### Rate Limiting
- 100 requests per 15 minutes per IP
- Configurable via environment variables
- Bypass for health check endpoints

### Connection Pooling
- WebSocket connections managed efficiently
- Automatic cleanup of stale connections
- RabbitMQ channel reuse

## Security

### Implemented Measures
- Helmet.js for security headers
- CORS with configurable origins
- Request validation and sanitization
- Rate limiting per IP
- Request size limits (10MB)
- Error message sanitization in production

### Best Practices
- Use environment variables for secrets
- Enable HTTPS in production
- Restrict CORS origins in production
- Implement authentication middleware
- Regular dependency updates

## License
MIT
