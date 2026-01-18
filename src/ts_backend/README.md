# TypeScript Backend - Oil Tracker System

Enterprise-grade TypeScript backend server providing API gateway, GraphQL, WebSocket, message queue integration, blockchain event monitoring, and intelligent caching for the Oil Tracker application.

## ✅ Implemented Features

### 1. Full Express.js API Implementation
- RESTful API endpoints with comprehensive routing
- Request validation using express-validator
- Rate limiting and security middleware (Helmet)
- Error handling and logging (Morgan)
- Request ID tracking for debugging
- CORS configuration

### 2. GraphQL Endpoint
- Apollo Server integration
- Complete schema for oil movements and subscriptions
- Real-time GraphQL subscriptions
- Optimized resolvers with error handling
- GraphQL Playground (development mode)

### 3. WebSocket Server for Real-time Updates
- Advanced WebSocket manager with connection pooling
- Topic-based subscriptions (oil-movements, subscriptions, blockchain, analytics)
- Heartbeat mechanism for connection health
- Event broadcasting to subscribed clients
- Integration with GraphQL subscriptions

### 4. Message Queue Integration (RabbitMQ)
- Robust RabbitMQ client with auto-reconnect
- Topic-based exchange system
- Event-driven architecture
- Queue handlers for oil movements, subscriptions, and blockchain events
- Graceful error handling and message requeuing

### 5. Blockchain Event Listener (Aptos)
- Real-time monitoring of Aptos blockchain events
- Automatic event polling with configurable intervals
- Event processing for oil movements and subscriptions
- Integration with message queue for event distribution

### 6. Cache Invalidation Strategy (Redis)
- Redis-based caching with automatic invalidation
- Event-driven cache invalidation
- Pattern-based cache clearing
- TTL management for different data types
- Cache warming strategies
- Middleware for automatic response caching

### 7. API Gateway/Reverse Proxy
- Intelligent request routing and proxying
- Path rewriting capabilities
- Request/response caching at gateway level
- Retry logic with exponential backoff
- Circuit breaker for downstream services
- Header forwarding and manipulation

## Installation

```bash
npm install
```

## Configuration

Create `.env` file:
```bash
cp .env.example .env
```

Key variables:
- `PORT` - Server port (default: 3000)
- `PYTHON_API_URL` - Python API endpoint
- `APTOS_RPC_URL` - Aptos blockchain RPC
- `REDIS_URL` - Redis cache URL
- `RABBITMQ_URL` - RabbitMQ URL

## Running

```bash
npm run dev    # Development mode
npm run build  # Build for production
npm start      # Run production build
```

## API Endpoints

### Health & Monitoring
- `GET /health` - Health check with service status
- `GET /api/ws/stats` - WebSocket statistics
- `GET /api/queue/stats` - Queue statistics
- `GET /api/blockchain/stats` - Blockchain listener stats
- `GET /api/cache/stats` - Cache statistics
- `GET /api/gateway/stats` - API Gateway stats

### GraphQL
- `POST /graphql` - GraphQL endpoint
- `GET /graphql` - GraphQL Playground (dev only)

### WebSocket
Connect to `ws://localhost:3000` and subscribe to topics:
```json
{"type": "subscribe", "topic": "oil-movements"}
```

## Architecture

```
Clients → TypeScript Backend → Python API
            ├── GraphQL
            ├── WebSocket
            ├── RabbitMQ
            ├── Redis Cache
            └── Aptos Blockchain
```

## License
MIT
