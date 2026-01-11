# SMART-Oil-Field

A SMART oil field digital platform combining IoT sensor data, real-time tracking, and blockchain verification for comprehensive oilfield operations management.

## Overview

This project integrates multiple technologies:
- **IoT & SCADA**: Real-time telemetry from oilfield sensors
- **RESTful APIs**: FastAPI (Python) and Express (TypeScript)
- **Blockchain**: Aptos Move smart contracts for immutable records
- **Web Dashboard**: Interactive frontend with live status monitoring

### Quick Feature Summary

| Category | Features |
|----------|----------|
| 📊 **Telemetry** | Real-time sensor data ingestion, querying, statistics, CSV export |
| 🛢️ **Oil Tracking** | Dual-mode (DB + Blockchain), 7 lifecycle stages, GPS tracking, quality monitoring |
| 💳 **Subscriptions** | Multi-token payments (APT, USDC, USDT), seasonal discounts (30%), promo codes, referral rewards (10%), loyalty rewards (15%), grace period (5 days), pro-rated refunds, installment plans |
| ⛓️ **Blockchain** | Aptos Move smart contracts, immutable records, event tracking, ownership transfer |
| 🔔 **Notifications** | Subscription expiration reminders with 3 severity levels |
| 🎨 **Frontend** | Interactive dashboard, real-time status indicators, modal-based actions |

## Project Components

- **Python API**: FastAPI service with CORS enabled for telemetry ingestion, querying, subscription management, oil tracking, and CSV export. See [src/python_api/README.md](src/python_api/README.md).
- **TypeScript Backend**: Express + TypeScript API gateway with full proxy coverage for all Python API endpoints (telemetry, subscriptions, oil tracking). See [src/ts_backend/README.md](src/ts_backend/README.md).
- **Move Subscriptions**: Aptos Move package for blockchain-based subscription management with payment processing, discount codes, seasonal promotions, and referral rewards. See [blockchain/move/subscriptions](blockchain/move/subscriptions).
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
### ⛓️ Blockchain Features

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

## ⚡ Performance Enhancements

- **Redis Caching (added)**: Python API caches responses for heavy read endpoints.
   - Cached endpoints: telemetry stats and oil track summary (TTL 60s).
   - Configure via environment: `REDIS_HOST` (default 127.0.0.1), `REDIS_PORT` (default 6379).
   - See details in [src/python_api/README.md](src/python_api/README.md).
- **SQLite Connection Pooling (added)**: SQLAlchemy `QueuePool` reduces connection overhead and improves concurrency.
   - Tunables: `DB_POOL_SIZE` (default 5), `DB_MAX_OVERFLOW` (default 10).
   - Details in [src/python_api/README.md](src/python_api/README.md).
- **Pagination (added)**: List endpoints support `limit` and `page` for efficient browsing.
- **Planned next steps**:
   - Background task queue (Celery)
   - Database indexing optimization

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

## Key Metrics 📈

- **10 Event Types**: Comprehensive on-chain event tracking
- **3 Discount Mechanisms**: Seasonal (30%), Promo codes (custom %), Loyalty (15%)
- **5-Day Grace Period**: Cancellation protection with renewal option
- **Pro-Rated Refunds**: Automatic calculation based on unused days
- **7 Oil Lifecycle Stages**: Complete tracking from drilling to delivery
- **10+ API Endpoints**: Full RESTful coverage for all operations
- **3 Notification Levels**: Info, Warning, Critical subscription alerts
- **100% Backend Sync**: All frontend features supported by both APIs

## Completed Features ✅

- ✅ **Promotional Discount System**: Custom codes with expiry and usage limits
- ✅ **Referral Rewards**: 10% APT rewards for referrers with comprehensive tracking
- ✅ **Loyalty Rewards**: 15% discount for returning subscribers
- ✅ **Grace Period System**: 5-day grace period on cancellation with renewal option
- ✅ **Partial Refunds**: Pro-rated refunds based on unused subscription days
- ✅ **Smart Discount Stacking**: Highest discount always applied
- ✅ **Subscription Reminders**: Multi-level expiration notifications
- ✅ **Oil Movement Tracking**: Dual-mode DB + Blockchain tracking
- ✅ **Comprehensive API Coverage**: Full sync between Python API and TypeScript gateway

## Future Enhancements 🚀

### Blockchain Enhancements
- [ ] **Grace Period System**: Allow subscribers to renew within grace period without data loss
- [ ] **Multi-Tier Loyalty**: Progressive discounts (15% → 20% → 25%) based on subscription count
- [ ] **NFT Badges**: Issue NFTs for milestones (10 referrals, 1-year subscriber, etc.)
- [ ] **Staking Rewards**: Stake APT to reduce subscription costs
- [ ] **Affiliate Tiers**: Multi-level referrals with different reward percentages

### Platform Features
- [ ] **Real-time WebSocket Streaming**: Live telemetry updates without polling
- [ ] **ML Predictions**: Equipment failure forecasting based on sensor patterns
- [ ] **Mobile App**: React Native app for field operators
- [ ] **IoT Integration**: Direct MQTT connection to physical sensors
- [ ] **Advanced Analytics**: Charts, graphs, predictive dashboards
- [ ] **Multi-user Auth**: Role-based access control (Admin, Operator, Viewer)
- [ ] **Blockchain Explorer**: Custom explorer for audit trails and transaction history
- [ ] **Email Notifications**: Automated alerts for expiring subscriptions
- [ ] **Payment Gateway**: Credit card integration alongside APT payments
