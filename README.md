# SMART-Oil-Field
A SMART oil field can be seen as a digitally connected environment where production, safety, and maintenance systems are monitored and optimized using technologies like the Internet of Things (IoT), Supervisory Control and Data Acquisition (SCADA), and data analytics.

## Project Components

- **Python API**: FastAPI service for telemetry ingestion, querying, and CSV export. See [src/python_api/README.md](src/python_api/README.md).
- **TypeScript Backend**: Express + TypeScript scaffold with a health route. See [src/ts_backend/README.md](src/ts_backend/README.md).
- **Move Subscriptions**: Aptos Move package for blockchain-based subscription management with payment processing, discount codes, and seasonal promotions. See [blockchain/move/subscriptions](blockchain/move/subscriptions).
- **Frontend Dashboard**: Interactive web interface for managing telemetry data and blockchain subscriptions with real-time expiration reminders. See [src/frontend/index.html](src/frontend/index.html).

## Features

### 🛢️ Telemetry Management
- Real-time oilfield sensor data ingestion (temperature, pressure, status)
- Query telemetry with filters (device ID, time range)
- Aggregated statistics and analytics
- CSV export for data analysis

### 🔔 Subscription Expiration Reminders
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
