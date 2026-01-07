# SMART-Oil-Field

A SMART oil field digital platform combining IoT sensor data, real-time tracking, and blockchain verification for comprehensive oilfield operations management.

## Overview

This project integrates multiple technologies:
- **IoT & SCADA**: Real-time telemetry from oilfield sensors
- **RESTful APIs**: FastAPI (Python) and Express (TypeScript)
- **Blockchain**: Aptos Move smart contracts for immutable records
- **Web Dashboard**: Interactive frontend with live status monitoring

## Project Components

- **Python API**: FastAPI service with CORS enabled for telemetry ingestion, querying, subscription management, oil tracking, and CSV export. See [src/python_api/README.md](src/python_api/README.md).
- **TypeScript Backend**: Express + TypeScript API gateway with full proxy coverage for all Python API endpoints (telemetry, subscriptions, oil tracking). See [src/ts_backend/README.md](src/ts_backend/README.md).
- **Move Subscriptions**: Aptos Move package for blockchain-based subscription management with payment processing, discount codes, and seasonal promotions. See [blockchain/move/subscriptions](blockchain/move/subscriptions).
- **Move Oil Tracker**: Aptos Move module for immutable, blockchain-verified oil batch tracking with ownership transfer and lifecycle events. See [blockchain/move/oil_tracker](blockchain/move/oil_tracker).
- **Frontend Dashboard**: Interactive web interface with configurable API routing, real-time backend status indicators, and subscription expiration reminders. See [src/frontend/index.html](src/frontend/index.html).

## Features

### 🛢️ Telemetry Management
- Real-time oilfield sensor data ingestion (temperature, pressure, status)
- Query telemetry with filters (device ID, time range)
- Aggregated statistics and analytics
- CSV export for data analysis

### 🛢️ Oil Movement Tracker
- **Dual-mode tracking**: Database (Python API) + Blockchain (Move module)
- **Real-time tracking** of oil batches from production to delivery
- **Full lifecycle management**: Production → Storage → Transit → Delivery
- **Location-based tracking** with GPS coordinates
- **Quality monitoring**: Temperature, viscosity, density, sulfur content
- **Interactive UI**: Create batches, record events, view movement history
- **RESTful API**: Full CRUD operations with filtering and statistics
- **Blockchain verification**: Immutable on-chain records via Aptos Move
- **Ownership transfer**: Transfer batches between parties on-chain
- See [docs/OIL_MOVEMENT_TRACKER.md](docs/OIL_MOVEMENT_TRACKER.md) and [blockchain/move/oil_tracker](blockchain/move/oil_tracker) for details

### �🔔 Subscription Expiration Reminders
- **Visual notifications** with 3 severity levels (info, warning, critical)
- **Automatic checking** on page load and every 5 minutes
- **Smart reminders**:
  - 14-8 days: Info notification
  - 7-4 days: Warning notification (orange)
  - 3-0 days: Critical notification (red, pulsing)
  - Expired: Critical alert
- **Backend API** for subscription status tracking
- **Fallback support** with localStorage for offline mode
- See [docs/SUBSCRIPTION_REMINDER_FEATURE.md](docs/SUBSCRIPTION_REMINDER_FEATURE.md) for details

### ⛓️ Blockchain Features

**Subscriptions** ([blockchain/move/subscriptions](blockchain/move/subscriptions)):
- APT cryptocurrency payment processing
- Seasonal discounts (30% off in March, August, October)
- Custom promo codes with expiry and usage limits
- Smart discount stacking (highest discount applies)
- Subscription renewal and cancellation
- Event tracking (payment, discounts, cancellations)

**Oil Tracking** ([blockchain/move/oil_tracker](blockchain/move/oil_tracker)):
- Immutable batch creation and lifecycle tracking
- 7 lifecycle stages (Drilling → Delivered)
- Ownership transfer between parties
- On-chain event logging with timestamps
- View functions for status queries
- Event emissions for real-time monitoring

### 🔌 Backend API Coverage

**Python API** (FastAPI) - Full implementation:
- ✅ Telemetry: Ingest, query, stats, export
- ✅ Oil Tracking: Batch creation, events, timeline
- ✅ Subscriptions: Create, query, status

**TypeScript Gateway** (Express) - Complete proxy coverage:
- ✅ `POST /api/telemetry` - Data ingestion
- ✅ `GET /api/telemetry` - Query with filters
- ✅ `GET /api/telemetry/stats` - Statistics
- ✅ `GET /api/telemetry/export` - CSV export
- ✅ `POST /api/oil/batches` - Create batch
- ✅ `POST /api/oil/batches/:id/events` - Add event
- ✅ `GET /api/oil/track/:id` - Timeline
- ✅ `POST /api/subscription` - Create subscription
- ✅ `GET /api/subscription/:userId` - Status

**Sync Status**: ✅ **Fully synced** - All frontend endpoints supported by both backends

### 🚀 Running the Application

### Option 1: Direct Python API (Default)

1. **Start the Python API**:
   ```powershell
   cd src/python_api
   .\run.ps1
   ```

2. **Open the frontend**:
   ```
   Open src/frontend/index.html in a browser
   ```

### Option 2: With TypeScript Gateway

1. **Start the Python API**:
   ```powershell
   cd src/python_api
   .\run.ps1
   ```

2. **Start the TypeScript backend**:
   ```powershell
   cd src/ts_backend
   npm install
   npm run dev
   ```

3. **Configure the frontend**:
   In `src/frontend/config.js`, set:
   ```javascript
   USE_GATEWAY: true
   ```

4. **Open the frontend**:
   ```
   Open src/frontend/index.html in a browser
   ```

### Running with VS Code Tasks

Use the built-in tasks:
- **Task**: "Run Python API" - Start FastAPI backend on port 8000
- **Task**: "Run TS Backend" - Start TypeScript gateway on port 3000

## API Endpoints

### Telemetry Endpoints
- `POST /api/telemetry` - Ingest sensor data
- `GET /api/telemetry?device_id=&limit=` - Query telemetry data
- `GET /api/telemetry/stats?device_id=` - Get statistics
- `GET /api/telemetry/export?device_id=&limit=` - Export to CSV

### Oil Tracking Endpoints
- `POST /api/oil/batches` - Create oil batch
- `GET /api/oil/batches?stage=&status=` - List batches
- `GET /api/oil/batches/:batch_id` - Get batch details
- `POST /api/oil/batches/:batch_id/events` - Add lifecycle event
- `GET /api/oil/batches/:batch_id/events` - List events
- `GET /api/oil/track/:batch_id` - Get full timeline with durations

### Subscription Endpoints
- `POST /api/subscription` - Create subscription
- `GET /api/subscription/:user_id` - Get subscription status
- `DELETE /api/subscription/:user_id` - Cancel subscription

### Health Check
- `GET /health` - Service health status
- `GET /api/status` - Combined backend status (TypeScript only)

## TypeScript Gateway Features

The TypeScript backend acts as a smart proxy layer:
- Full endpoint coverage matching Python API
- Error handling and response formatting
- CORS configuration
- Health monitoring for both services
- **Configurable API routing** via `config.js`:
  - Toggle between direct Python API or TypeScript gateway
  - `USE_GATEWAY: false` (default) - Direct Python API calls
  - `USE_GATEWAY: true` - Route through TypeScript gateway
- **Real-time status indicators**:
  - Visual online/offline status for both backends
  - Automatic status checking every 30 seconds
  - Console logging for API configuration

## Architecture

```
                          Frontend (index.html)
                                  ↓
                      config.js (API Configuration)
                                  ↓
        ┌─────────────────────────┴─────────────────────────┐
        │                                                    │
   Direct Mode                                        Gateway Mode
   (default)                                           (optional)
        │                                                    │
        ↓                                                    ↓
  Python API ←─────────────────────────────────→  TypeScript API
   :8000                                                   :3000
        │                                                    │
        ├── SQLite Database                                 │
        │   └── Telemetry, Oil Batches, Subscriptions       │
        │                                                    │
        └────────────────────────────────────────────────────┘
                                  ↓
                         Blockchain Layer (Optional)
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            Aptos Move Modules                  │
                    │                           │
        ┌───────────┴───────────┐               │
        │                       │               │
  Subscription Module    Oil Tracker Module     │
        │                       │               │
        └───────────────────────┴───────────────┘
          • Payment processing     • Immutable batches
          • Promo codes           • Ownership transfer
          • Seasonal discounts    • Lifecycle events
```

### Data Flow

- **Database (SQLite)**: Fast queries, analytics, CSV export
- **Blockchain (Aptos)**: Immutable records, ownership proof, audit trail
- **Hybrid Model**: Store operational data in DB, critical records on-chain

## Quick Start (Python API)

1. **Seed and run the database**:
   ```powershell
   cd src/python_api
   .\run.ps1
   ```
   See [src/python_api/README.md](src/python_api/README.md) for detailed setup instructions.

2. **Open the frontend**:
   - Open `src/frontend/index.html` in your browser
   - Status indicators show backend connectivity
   - Test telemetry, oil tracking, and subscription features

## Blockchain Deployment

### Deploy Subscription Module

```powershell
cd blockchain/move/subscriptions
.\scripts\publish.ps1
```

### Deploy Oil Tracker Module

```powershell
cd blockchain/move/oil_tracker
.\scripts\publish.ps1
```

Both scripts support Devnet, Testnet, and Mainnet deployment.

See module READMEs for usage examples:
- [Subscription Module Guide](blockchain/move/subscriptions/README.md)
- [Oil Tracker Module Guide](blockchain/move/oil_tracker/README.md)

## Testing the Subscription Reminder Feature

1. **Start the Python API**:
   ```powershell
   cd src/python_api
   .\run.ps1
   ```

2. **Open the frontend** in a browser:
   ```
   src/frontend/index.html
   ```

3. **Test with API** (recommended):
   Open browser console and run:
   ```javascript
   // Create a subscription expiring in 5 days (warning)
   createSubscription('demo_user', 1, 5)
   
   // Create a critical subscription (2 days)
   createSubscription('demo_user', 1, 2)
   ```

4. **Test offline** (localStorage):
   ```javascript
   // Set subscription expiring in 5 days
   setMockSubscription(5)
   
   // Set critical subscription (2 days)
   setMockSubscription(2)
   
   // Clear subscription
   clearSubscription()
   ```

## Repository

- **GitHub**: https://github.com/davelee001/SMART-Oil-Field.git
- **License**: Educational project - ICT Application in Oil and Gas

## Technology Stack

- **Backend**: Python (FastAPI), TypeScript (Express), SQLite
- **Blockchain**: Aptos Move, APT cryptocurrency
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **DevOps**: PowerShell scripts, VS Code tasks, Git

## Future Enhancements

- [ ] Real-time WebSocket telemetry streaming
- [ ] Machine learning predictions for equipment failure
- [ ] Mobile app for field operators
- [ ] Integration with actual IoT sensors (MQTT)
- [ ] Advanced analytics dashboard with charts
- [ ] Multi-user authentication and authorization
- [ ] Blockchain explorer integration for audit trails
