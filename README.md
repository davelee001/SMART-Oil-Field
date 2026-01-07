# SMART-Oil-Field
A SMART oil field can be seen as a digitally connected environment where production, safety, and maintenance systems are monitored and optimized using technologies like the Internet of Things (IoT), Supervisory Control and Data Acquisition (SCADA), and data analytics.

## Project Components

- **Python API**: FastAPI service with CORS enabled for telemetry ingestion, querying, subscription management, oil tracking, and CSV export. See [src/python_api/README.md](src/python_api/README.md).
- **TypeScript Backend**: Express + TypeScript API gateway with full proxy coverage for all Python API endpoints (telemetry, subscriptions, oil tracking). See [src/ts_backend/README.md](src/ts_backend/README.md).
- **Move Subscriptions**: Aptos Move package for blockchain-based subscription management with payment processing, discount codes, and seasonal promotions. See [blockchain/move/subscriptions](blockchain/move/subscriptions).
- **Frontend Dashboard**: Interactive web interface with configurable API routing, real-time backend status indicators, and subscription expiration reminders. See [src/frontend/index.html](src/frontend/index.html).

## Features

### 🛢️ Telemetry Management
- Real-time oilfield sensor data ingestion (temperature, pressure, status)
- Query telemetry with filters (device ID, time range)
- Aggregated statistics and analytics
- CSV export for data analysis

### � Oil Movement Tracker
- **Real-time tracking** of oil batches from production to delivery
- **Full lifecycle management**: Production → Storage → Transit → Delivery
- **Location-based tracking** with GPS coordinates
- **Quality monitoring**: Temperature, viscosity, density, sulfur content
- **Interactive UI**: Create batches, record events, view movement history
- **RESTful API**: Full CRUD operations with filtering and statistics
- See [docs/OIL_MOVEMENT_TRACKER.md](docs/OIL_MOVEMENT_TRACKER.md) for details

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

### ⛓️ Blockchain Subscriptions
- APT cryptocurrency payment processing
- Seasonal discounts (30% off in March, August, October)
- Custom promo codes with expiry and usage limits
- Smart discount stacking (highest discount applies)
- Subscription renewal and cancellation
- Event tracking (payment, discounts, cancellations)

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
┌─────────────────┬────────────────────┐
│  Direct Mode    │   Gateway Mode     │
│  (default)      │   (optional)       │
├─────────────────┼────────────────────┤
│                 │                    │
│  Python API     │  TypeScript API    │
│  :8000          │  :3000             │
│                 │      ↓             │
│                 │  Python API        │
│                 │  :8000             │
└─────────────────┴────────────────────┘
```

## Quick Start (Python API)

- Seed and run:
	- See [src/python_api/README.md](src/python_api/README.md) for setup, seeding, and run instructions.

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

- Remote: https://github.com/davelee001/SMART-Oil-Field.git
