# SMART-Oil-Field

A SMART oil field digital platform combining IoT sensor data, real-time tracking, and blockchain verification for comprehensive oilfield operations management.

## Overview

This project integrates multiple technologies:
- **IoT & SCADA**: Real-time telemetry from oilfield sensors with WebSocket streaming
- **RESTful APIs**: FastAPI (Python) and Express (TypeScript) with comprehensive endpoints
- **Blockchain**: Aptos Move smart contracts for immutable records
- **Web Dashboard**: Interactive frontend with live status monitoring
- **Data Analytics**: Time-series DB, warehouse, ML predictions, anomaly detection, and backup/DR
- **Advanced Features**: Predictive analytics, alerting system, audit logging, and real-time monitoring

### Quick Feature Summary

| Category | Features |
|----------|----------|
| Telemetry | Real-time sensor data ingestion, WebSocket streaming, querying, statistics, CSV export, async tasks |
| Oil Tracking | Dual-mode (DB + Blockchain), 7 lifecycle stages, GPS tracking, quality monitoring |
| Subscriptions | Multi-token payments (APT, USDC, USDT), seasonal discounts (30%), promo codes, referral rewards (10%), loyalty rewards (15%), grace period (5 days), pro-rated refunds, installment plans |
| Blockchain | Aptos Move smart contracts, immutable records, event tracking, ownership transfer |
| Notifications | Subscription expiration reminders with 3 severity levels, email/SMS alerts |
| Frontend | Interactive dashboard, real-time status indicators, modal-based actions |
| Analytics | InfluxDB time-series, DuckDB warehouse, ML anomaly detection, predictive analytics, trend analysis |
| Monitoring | Real-time WebSocket connections, anomaly detection, alerting system, audit logging |
| Data Management | Batch CSV upload, data validation schemas, aggregation by time buckets, historical trends |

## Project Components

- **Python API**: FastAPI service with CORS enabled for telemetry ingestion, querying, subscription management, oil tracking, and CSV export. See [src/python_api/README.md](src/python_api/README.md).
- **TypeScript Backend**: Express + TypeScript API gateway with full proxy coverage for all Python API endpoints (telemetry, subscriptions, oil tracking). See [src/ts_backend/README.md](src/ts_backend/README.md).
- **Move Subscriptions**: Aptos Move package for blockchain-based subscription management with payment processing, discount codes, seasonal promotions, and referral rewards. See [blockchain/move/subscriptions](blockchain/move/subscriptions).
- **Move Oil Tracker**: Aptos Move module for immutable, blockchain-verified oil batch tracking with ownership transfer and lifecycle events. See [blockchain/move/oil_tracker](blockchain/move/oil_tracker).
- **Frontend Dashboard**: Interactive web interface with configurable API routing, real-time backend status indicators, and subscription expiration reminders. See [src/frontend/index.html](src/frontend/index.html).

## Features

### Telemetry Management
- Real-time oilfield sensor data ingestion (temperature, pressure, status)
- Query telemetry with filters (device ID, time range)
- Aggregated statistics and analytics
- CSV export for data analysis

### Oil Movement Tracker
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

### Subscription Expiration Reminders
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
### 💰 Referral System
- **10% APT rewards**: Referrers automatically earn 10% of subscription price
- **Automatic distribution**: Rewards transferred instantly on subscription
- **Comprehensive tracking**: Monitor total rewards, referral count, and active referrals
- **Smart contract integration**: All logic handled on-chain for transparency
- **Referral statistics**: Query referrer info, total earnings, and active subscriptions
- **Cancel handling**: Active referral count decrements when users cancel
- **Event emission**: ReferralRewardPaid events for audit and analytics
- **Dashboard UI**: Subscribe with referral and view referral stats modals

### 🎁 Loyalty Rewards
- **15% discount for returning subscribers**: Automatic loyalty discount on repeat subscriptions
- **Subscription count tracking**: System tracks total subscription history per user
- **Smart discount stacking**: Loyalty discount competes with seasonal and promo discounts (highest wins)
- **Event logging**: LoyaltyRewardApplied events track all loyalty discounts
- **Transparent on-chain**: All loyalty logic in smart contract, no off-chain manipulation
- **Immediate activation**: Loyalty discount available on 2nd and subsequent subscriptions
- **Example**: Subscribe once at full price → All future subscriptions get 15% off (unless higher discount applies)

### ⏰ Grace Period System
- **5-day grace period**: Subscribers get 5 days to renew after cancellation
- **Full access restoration**: Renewing during grace period restores complete subscription
- **Flexible cancellation**: Choose between grace period or immediate hard cancel
- **Grace period tracking**: On-chain status with expiry timestamp
- **Event monitoring**: GracePeriodStarted events for analytics
- **Smart contract enforcement**: All grace period logic handled on-chain
- **Example**: Cancel subscription → Get 5 days to change mind → Renew to restore OR wait for permanent removal

### 💰 Partial Refunds
- **Pro-rated refunds**: Get refund based on unused subscription days
- **Automatic calculation**: (Unused Days / Total Days) × Payment Amount
- **Admin-approved**: Plan admin must approve and process refund
- **On-chain tracking**: RefundIssued events with refund amount and unused days
- **Smart contract logic**: All refund calculations handled transparently on-chain
- **Example**: 15 days unused of 30-day plan (1 APT) = 0.5 APT refund
- **Protection**: Payment amount and subscription start tracked for accurate calculations
### Blockchain Features

**Subscriptions** ([blockchain/move/subscriptions](blockchain/move/subscriptions)):
- APT cryptocurrency payment processing
- Seasonal discounts (30% off in March, August, October)
- Custom promo codes with expiry and usage limits
- **Loyalty rewards (15% off for returning subscribers)**
- **Referral system (10% rewards for referrers)**
- **Grace period (5 days to renew after cancellation)**
   - Cancel enters a 5-day grace period; user can renew to restore access
   - Hard cancel immediately removes subscription
   - On-chain tracking: `in_grace_period`, `grace_ends_at` fields
   - Event: `GracePeriodStarted { user, expired_at, grace_ends_at }`
- **Partial refunds (pro-rated refunds on early cancellation)**
   - Admin can issue refund based on unused days
   - Refund formula: `(Unused Days / Total Days) × Payment Amount`
   - On-chain tracking: `last_payment_amount`, `subscription_start` fields
   - Event: `RefundIssued { user, plan_id, refund_amount, days_unused }`
- Smart discount stacking (highest discount applies)
- Subscription renewal and cancellation
- Event tracking (payment, discounts, referrals, loyalty, grace period, refunds, cancellations)
- Referral stats tracking (total rewards, active referrals)
- Payment enhancements: multi-token (APT/USDC/USDT), installment plans, stablecoin pricing, receipts/invoices, escrow for disputes. See [blockchain/move/subscriptions/README_PAYMENT_ENHANCEMENTS.md](blockchain/move/subscriptions/README_PAYMENT_ENHANCEMENTS.md)

**Event Types:**
- `PlanCreated { plan_id, duration_secs, price_octas }`
- `Subscribed { user, plan_admin, plan_id, expires_at }`
- `Canceled { user }`
- `PaymentReceived { from, plan_id, amount_octas }`
- `PaymentFailed { from, plan_id, required_octas, reason }`
- `DiscountApplied { user, plan_id, original_price, discounted_price, month }`
- `DiscountCodeUsed { user, code, discount_percent, savings }`
- `ReferralRewardPaid { referrer, referee, plan_id, reward_octas }`
- `LoyaltyRewardApplied { user, plan_id, subscription_count, discount_percent, savings }`
- `GracePeriodStarted { user, expired_at, grace_ends_at }`
- `RefundIssued { user, plan_id, refund_amount, days_unused }`

**Oil Tracking** ([blockchain/move/oil_tracker](blockchain/move/oil_tracker)):
- Immutable batch creation and lifecycle tracking
- 7 lifecycle stages (Drilling → Delivered)
- Ownership transfer between parties
- On-chain event logging with timestamps
- View functions for status queries
- Event emissions for real-time monitoring

### 🔌 Backend API Coverage

**Python API** (FastAPI) - Full implementation:
- Telemetry: Ingest, query, stats, export
- Oil Tracking: Batch creation, events, timeline
- Subscriptions: Create, query, status

**TypeScript Gateway** (Express) - Complete proxy coverage:
- `POST /api/telemetry` - Data ingestion
- `GET /api/telemetry` - Query with filters
- `GET /api/telemetry/stats` - Statistics
- `GET /api/telemetry/export` - CSV export
- `POST /api/oil/batches` - Create batch
- `POST /api/oil/batches/:id/events` - Add event
- `GET /api/oil/track/:id` - Timeline
- `POST /api/subscription` - Create subscription
- `GET /api/subscription/:userId` - Status

**Sync Status**: **Fully synced** - All frontend endpoints supported by both backends

## Recent Updates (v0.6.0)

### Major Feature Enhancements

**Real-Time Monitoring & WebSocket Integration**:
- WebSocket server for real-time telemetry streaming (`/ws/telemetry`)
- Live data broadcasting to connected clients
- Connection manager with automatic cleanup
- TypeScript proxy with WebSocket forwarding

**Advanced Analytics & ML**:
- **Anomaly Detection**: ML-based (RandomForest) and rule-based detection with confidence scores
- **Predictive Analytics**: Prophet-based forecasting for temperature, pressure, and production metrics
- **Historical Trend Analysis**: Linear trends, seasonal patterns, moving averages, and statistical analysis
- **Data Aggregation**: Time-bucket aggregation (hourly/daily) with anomaly rate analysis

**Alerting & Notification System**:
- **Multi-Channel Alerts**: Email (SMTP) and SMS (Twilio) notifications
- **Configurable Alert Rules**: Threshold-based alerts for temperature, pressure, and anomaly detection
- **Alert Management**: Create, query, and manage alerts with priority levels
- **Automated Alerting**: Integration with anomaly detection and predictive models

**Data Management & Validation**:
- **Batch CSV Upload**: Flexible column mapping, validation, and error reporting
- **Enhanced Data Validation**: Comprehensive Pydantic schemas with custom validators
- **Upload History**: Track and manage data import operations
- **Data Integrity**: Advanced validation rules for device IDs, coordinates, and sensor data

**Audit & Compliance**:
- **Complete Audit Logging**: Automatic logging of all API operations
- **Audit Analytics**: Query audit logs with filtering and statistics
- **Compliance Ready**: Detailed activity tracking for regulatory requirements
- **Performance Monitoring**: Response time tracking and error rate analysis

### Data & Analytics Stack:
- InfluxDB integration for time-series telemetry storage and querying
- DuckDB warehouse with ETL scripts for analytics and Parquet exports
- BI guides for Power BI and Tableau connectivity
- ML pipeline: RandomForest anomaly detection with training script and inference API
- Automated backup and disaster recovery scripts

### Performance Enhancements:
- Redis caching for stats and track endpoints
- SQLAlchemy connection pooling for SQLite
- Pagination on list endpoints
- Celery async CSV export
- Database indexing optimizations

### Security & Auth:
- JWT authentication, OAuth2 support, API key validation
- Role-based access control (RBAC)
- Rate limiting per user/endpoint
- Audit logging middleware

### API Expansions:
- WebSocket endpoints for real-time data streaming
- ML prediction and anomaly detection endpoints
- Alert management endpoints
- Audit logging and analytics endpoints
- Batch upload and validation endpoints
- InfluxDB read endpoints
- Async task status for exports

### Running the Application

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

## Performance Enhancements

- **Redis Caching (added)**: Python API caches responses for heavy read endpoints.
   - Cached endpoints: telemetry stats and oil track summary (TTL 60s).
   - Configure via environment: `REDIS_HOST` (default 127.0.0.1), `REDIS_PORT` (default 6379).
   - See details in [src/python_api/README.md](src/python_api/README.md).
- **SQLite Connection Pooling (added)**: SQLAlchemy `QueuePool` reduces connection overhead and improves concurrency.
   - Tunables: `DB_POOL_SIZE` (default 5), `DB_MAX_OVERFLOW` (default 10).
   - Details in [src/python_api/README.md](src/python_api/README.md).
- **Pagination (added)**: List endpoints support `limit` and `page` for efficient browsing.
- **Celery Background Queue (added)**: Offload heavy tasks to a worker using Redis.
   - Broker/backend: `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND` (default `redis://127.0.0.1:6379/0`).
   - Worker start (Windows): `src/python_api/.venv/Scripts/celery.exe -A app.tasks.celery_app worker -l info`
   - Async export endpoints: `POST /api/telemetry/export/async` and `GET /api/tasks/{task_id}`.
 - **Indexing Optimizations (added)**: Automatic SQLite indexes to speed up common queries.
    - `telemetry(device_id, ts)`, `telemetry(ts)`
    - `oil_batches(current_stage, status)`, `oil_batches(created_at)`
    - `oil_events(batch_id, ts)`

## Data & Analytics

- **Time-Series DB (InfluxDB)**
   - Optional integration to store telemetry as time-series for scalable reads/writes.
   - Configure via env: `INFLUX_URL`, `INFLUX_TOKEN`, `INFLUX_ORG`, `INFLUX_BUCKET`.
   - Endpoints: `POST /api/telemetry` writes to both SQLite and InfluxDB; `GET /api/telemetry/influx` reads recent data.

- **Data Warehouse & BI**
   - Target: DuckDB (file-based) for local analytics on Windows; can swap to Postgres/BigQuery later.
   - ETL Scope: Extract from SQLite → DuckDB tables and Parquet in `data/processed/warehouse/`.
      - Tables: `wh_telemetry`, `wh_oil_batches`, `wh_oil_events`, plus daily/hourly rollups.
   - BI:
      - Power BI: Connect to Parquet folder or DuckDB via ODBC.
      - Tableau: Connect to Parquet or DuckDB ODBC.
   - Upcoming scripts:
      - `scripts/etl_warehouse.py` — ETL from SQLite to DuckDB + Parquet.
      - `scripts/etl.config.json` — ETL configuration (to be added).
   - Detailed guide: [docs/DATA_WAREHOUSE_BI.md](docs/DATA_WAREHOUSE_BI.md)
   - Quick run:
      ```powershell
      # From repo root
      python scripts/etl_warehouse.py
      ```
   - Run ETL:
      ```powershell
      # From repo root
      python scripts/etl_warehouse.py
      ```

- **ML Predictions (added)**
   - RandomForest training script: `scripts/train_ml.py` (saves `src/python_api/app/models/telemetry_anomaly.pkl`).
   - Inference endpoint: `POST /api/ml/predict` — returns anomaly flag and score using model or rule-based fallback.

- **Backup & DR (added)**
   - Automated backup scripts for SQLite DB, DuckDB warehouse, Parquet files, and configs.
   - Restore playbooks for disaster recovery.
   - Scheduled backups via PowerShell tasks.
   - See `scripts/backup.ps1`, `scripts/restore.ps1`, and [docs/BACKUP_DR.md](docs/BACKUP_DR.md).

### Running with VS Code Tasks

Use the built-in tasks:
- **Task**: "Run Python API" - Start FastAPI backend on port 8000
- **Task**: "Run TS Backend" - Start TypeScript gateway on port 3000

## API Endpoints

### Telemetry Endpoints
- `POST /api/telemetry` - Ingest sensor data
- `GET /api/telemetry?device_id=&limit=&page=` - Query telemetry data (pagination)
- `GET /api/telemetry/stats?device_id=` - Get statistics
- `GET /api/telemetry/export?device_id=&limit=` - Export to CSV
- `POST /api/telemetry/export/async?device_id=&limit=` - Enqueue CSV export (returns task id)
- `GET /api/tasks/:task_id` - Check task status and retrieve result
- `GET /api/telemetry/influx?device_id=&hours=` - Read from InfluxDB time-series
- `GET /api/telemetry/aggregate?device_id=&bucket=&from=&to=` - Aggregate data by time buckets

### Real-Time WebSocket
- `WebSocket /ws/telemetry` - Real-time telemetry streaming

### ML & Analytics Endpoints
- `POST /api/ml/predict` - Anomaly detection with ML/rule-based fallback
- `POST /api/ml/config` - Configure ML models and parameters
- `GET /api/ml/config` - Get current ML configuration
- `GET /api/ml/anomalies?device_id=&from=&to=` - Query detected anomalies
- `GET /api/ml/anomaly-stats?device_id=` - Anomaly statistics and trends
- `POST /api/predict/forecast` - Predictive analytics with Prophet
- `GET /api/predict/models` - List available prediction models
- `POST /api/predict/train/:deviceId` - Train prediction model
- `POST /api/predict/production` - Forecast production metrics

### Alerting System
- `POST /api/alerts` - Create alert configuration
- `GET /api/alerts` - List alert configurations
- `GET /api/alerts/:id` - Get specific alert
- `PUT /api/alerts/:id` - Update alert configuration
- `DELETE /api/alerts/:id` - Delete alert configuration
- `GET /api/alerts/triggered` - Get triggered alerts

### Data Upload & Validation
- `POST /api/upload/telemetry-csv` - Batch upload telemetry data via CSV
- `GET /api/upload/history` - Get upload history and status

### Audit Logging
- `GET /api/audit/logs` - Query audit logs with filtering
- `GET /api/audit/logs/:log_id` - Get specific audit log entry
- `GET /api/audit/stats` - Get audit statistics and analytics

### Oil Tracking Endpoints
- `POST /api/oil/batches` - Create oil batch
- `GET /api/oil/batches?stage=&status=&limit=&page=` - List batches (pagination)
- `GET /api/oil/batches/:batch_id` - Get batch details
- `POST /api/oil/batches/:batch_id/events` - Add lifecycle event
- `GET /api/oil/batches/:batch_id/events?ascending=&limit=&page=` - List events (optional pagination)
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
   :8000      WebSocket /ws/telemetry              :3000
        │      REST API /api/*                            │
        ├── SQLite Database                               │
        │   └── Telemetry, Oil Batches, Subscriptions,    │
        │       Audit Logs, Alerts                         │
        │                                                  │
        ├── Redis Cache (optional)                         │
        │   └── Stats, Analytics, Sessions                 │
        │                                                  │
        ├── InfluxDB (optional)                            │
        │   └── Time-series telemetry                      │
        │                                                  │
        └── ML Models                                      │
            └── Anomaly detection, Forecasting            │
                                                          │
        ┌─────────────────────────────────────────────────┘
        │
   Real-Time Streaming
        │
        ↓
  WebSocket Clients
   (Live Dashboards,
    Mobile Apps,
    IoT Devices)
```

### Data Flow

- **Database (SQLite)**: Fast queries, analytics, CSV export, audit logging
- **Cache (Redis)**: Performance optimization for heavy read operations
- **Time-Series (InfluxDB)**: Scalable storage for high-frequency telemetry
- **Blockchain (Aptos)**: Immutable records, ownership proof, audit trail
- **Real-Time (WebSocket)**: Live streaming for dashboards and monitoring systems
- **ML Pipeline**: Anomaly detection, predictive analytics, automated alerting
- **Hybrid Model**: Store operational data in DB, critical records on-chain, stream real-time data via WebSocket

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

## Testing Advanced Features

### Real-Time WebSocket Streaming

1. **Connect to WebSocket**:
   ```javascript
   const ws = new WebSocket('ws://localhost:8000/ws/telemetry');
   ws.onmessage = (event) => {
     const data = JSON.parse(event.data);
     console.log('Real-time telemetry:', data);
   };
   ```

2. **Send telemetry data** to trigger broadcasts:
   ```javascript
   // In another tab/console
   fetch('/api/telemetry', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       device_id: 'well-001',
       temperature: 85.5,
       pressure: 245.8,
       status: 'OK'
     })
   });
   ```

### Anomaly Detection & Predictive Analytics

1. **Test anomaly detection**:
   ```javascript
   fetch('/api/ml/predict', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       device_id: 'well-001',
       temperature: 150.0,  // Anomalous high temperature
       pressure: 200.0,
       status: 'OK'
     })
   }).then(r => r.json()).then(console.log);
   ```

2. **Test predictive forecasting**:
   ```javascript
   fetch('/api/predict/forecast', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       device_id: 'well-001',
       metric: 'temperature',
       hours_ahead: 24
     })
   }).then(r => r.json()).then(console.log);
   ```

### Alerting System

1. **Create an alert configuration**:
   ```javascript
   fetch('/api/alerts', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       name: 'High Temperature Alert',
       device_id: 'well-001',
       metric: 'temperature',
       threshold: 120.0,
       condition: 'above',
       channels: ['email'],
       email_recipients: ['admin@oilfield.com']
     })
   }).then(r => r.json()).then(console.log);
   ```

2. **Check triggered alerts**:
   ```javascript
   fetch('/api/alerts/triggered')
   .then(r => r.json()).then(console.log);
   ```

### Batch CSV Upload

1. **Upload telemetry CSV**:
   ```javascript
   const formData = new FormData();
   formData.append('file', csvFile);  // Your CSV file
   formData.append('column_mapping', JSON.stringify({
     device_id: 'Device ID',
     temperature: 'Temp (°C)',
     pressure: 'Pressure (psi)',
     status: 'Status'
   }));
   
   fetch('/api/upload/telemetry-csv', {
     method: 'POST',
     body: formData
   }).then(r => r.json()).then(console.log);
   ```

### Audit Logging

1. **Query audit logs**:
   ```javascript
   fetch('/api/audit/logs?limit=10&action=CREATE')
   .then(r => r.json()).then(console.log);
   ```

2. **Get audit statistics**:
   ```javascript
   fetch('/api/audit/stats')
   .then(r => r.json()).then(console.log);
   ```

## Repository

- **GitHub**: https://github.com/davelee001/SMART-Oil-Field.git
- **License**: Educational project - ICT Application in Oil and Gas

## Technology Stack

- **Backend**: Python (FastAPI), TypeScript (Express), SQLite, Redis, InfluxDB
- **Blockchain**: Aptos Move, APT cryptocurrency, USDC, USDT
- **Frontend**: Vanilla JavaScript, HTML5, CSS3, WebSocket
- **Machine Learning**: scikit-learn (RandomForest), Prophet, pandas, numpy
- **Data Processing**: DuckDB, Parquet, CSV validation
- **Communication**: WebSocket, SMTP (email), Twilio (SMS)
- **DevOps**: PowerShell scripts, VS Code tasks, Git, Celery
- **Security**: JWT, OAuth2, RBAC, rate limiting, audit logging
- **Monitoring**: Real-time streaming, alerting, anomaly detection

## Key Metrics

- **15 Event Types**: Comprehensive on-chain event tracking (subscriptions, oil tracking, payments)
- **3 Discount Mechanisms**: Seasonal (30%), Promo codes (custom %), Loyalty (15%)
- **5-Day Grace Period**: Cancellation protection with renewal option
- **Pro-Rated Refunds**: Automatic calculation based on unused days
- **7 Oil Lifecycle Stages**: Complete tracking from drilling to delivery
- **25+ API Endpoints**: Full RESTful coverage for all operations including WebSocket
- **3 Notification Levels**: Info, Warning, Critical subscription alerts
- **100% Backend Sync**: All frontend features supported by both APIs
- **Real-Time Streaming**: WebSocket connections for live telemetry updates
- **ML Integration**: Anomaly detection, predictive analytics, and trend analysis
- **Multi-Channel Alerts**: Email and SMS notifications with configurable rules
- **Complete Audit Trail**: Full API activity logging with analytics and compliance features
- **Advanced Validation**: Comprehensive Pydantic schemas with custom business rules
- **Batch Processing**: CSV upload with flexible mapping and validation

## Completed Features

### Core Platform Features
- Promotional Discount System: Custom codes with expiry and usage limits
- Referral Rewards: 10% APT rewards for referrers with comprehensive tracking
- Loyalty Rewards: 15% discount for returning subscribers
- Grace Period System: 5-day grace period on cancellation with renewal option
- Partial Refunds: Pro-rated refunds based on unused subscription days
- Smart Discount Stacking: Highest discount always applied
- Subscription Reminders: Multi-level expiration notifications
- Oil Movement Tracking: Dual-mode DB + Blockchain tracking
- Comprehensive API Coverage: Full sync between Python API and TypeScript gateway

### Advanced Analytics & Monitoring
- Real-Time WebSocket Streaming: Live telemetry updates without polling
- ML Anomaly Detection: RandomForest and rule-based anomaly detection with confidence scores
- Predictive Analytics: Prophet-based forecasting for sensor data and production metrics
- Historical Trend Analysis: Linear trends, seasonal patterns, and moving averages
- Data Aggregation: Time-bucket aggregation with anomaly rate analysis
- Alerting System: Multi-channel email/SMS alerts with configurable rules
- Audit Logging: Complete API activity tracking with analytics and compliance features

### Data Management & Validation
- Batch CSV Upload: Flexible column mapping with validation and error reporting
- Enhanced Data Validation: Comprehensive Pydantic schemas with custom validators
- Upload History Tracking: Monitor and manage data import operations
- Data Integrity Checks: Advanced validation for device IDs, coordinates, and sensor ranges

### Performance & Security
- Redis Caching: Optimized response times for heavy read operations
- Database Indexing: Optimized queries for telemetry, batches, and events
- Connection Pooling: SQLAlchemy QueuePool for improved concurrency
- Rate Limiting: Per-user and per-endpoint rate limiting
- JWT Authentication: Secure API access with token-based auth
- Role-Based Access Control: Admin, operator, and viewer roles
- Async Task Processing: Celery-based background job processing

## Future Enhancements

### Platform Enhancements
- [ ] **Mobile App**: React Native app for field operators with offline capabilities
- [ ] **IoT Integration**: Direct MQTT connection to physical sensors and SCADA systems
- [ ] **Advanced Analytics Dashboard**: Interactive charts, graphs, and predictive visualizations
- [ ] **Multi-tenant Architecture**: Support for multiple oilfield operations
- [ ] **Blockchain Explorer**: Custom explorer for audit trails and transaction history
- [ ] **Automated Reporting**: Scheduled PDF/Excel reports for stakeholders
- [ ] **Geospatial Analytics**: Map-based visualization of oilfield operations
- [ ] **Edge Computing**: On-site ML inference for real-time decision making

### AI/ML Enhancements
- [ ] **Deep Learning Models**: LSTM networks for time-series forecasting
- [ ] **Computer Vision**: Drone imagery analysis for facility inspection
- [ ] **Natural Language Processing**: Automated incident report analysis
- [ ] **Reinforcement Learning**: Optimized production scheduling
- [ ] **Model Explainability**: XAI explanations for ML predictions
- [ ] **AutoML**: Automated model selection and hyperparameter tuning

### Security & Compliance
- [ ] **Advanced Encryption**: End-to-end encryption for sensitive data
- [ ] **GDPR Compliance**: Data portability and right to erasure
- [ ] **SOC 2 Certification**: Security and compliance framework
- [ ] **Zero Trust Architecture**: Micro-segmentation and continuous verification
- [ ] **Threat Intelligence**: Integration with security threat feeds
- [ ] **Automated Compliance Reporting**: Regulatory reporting automation

### Blockchain Enhancements
- [ ] **Multi-Tier Loyalty**: Progressive discounts (15% → 20% → 25%) based on subscription count
- [ ] **NFT Badges**: Issue NFTs for milestones (10 referrals, 1-year subscriber, etc.)
- [ ] **Staking Rewards**: Stake APT to reduce subscription costs
- [ ] **Affiliate Tiers**: Multi-level referrals with different reward percentages
- [ ] **Cross-Chain Integration**: Support for multiple blockchain networks
- [ ] **Decentralized Identity**: Self-sovereign identity for users and devices
