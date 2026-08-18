# SMART-Oil-Field

A SMART Oil Field Performance Management System combining secure organizational workflows with IoT telemetry, oil-movement tracking, analytics, machine learning, and blockchain provenance. PostgreSQL is the PMS system of record; specialist operational services retain their existing responsibilities.

## PMS delivery status

| Phase | Module | Status |
|---|---|---|
| 1 | PostgreSQL identity, authentication, RBAC, and user administration | Implemented |
| 2 | Projects, objectives, activities, milestones, deliverables, risks, and staff assignments | Implemented |
| 3 | Integration and operational continuity for specialist services | Implemented |
| 4 | Annual project budgeting, allocations, commitments, expenditure, periods, evidence, and approvals | Implemented |
| 5 | Oil-sector compliance and regulation register | Implemented |
| 6 | Supply chain and supplier performance | Implemented; existing oil-movement tracking remains available |
| 7 | Configurable KPI and performance engine | Implemented; existing operational analytics remain available |
| 8 | Staff training and capacity building | Implemented |
| 9 | Formal PMS reporting and analytics | Implemented; governed outputs complement existing technical exports |
| 10 | Full-system testing, finalization, and production deployment | Repository implementation complete; live acceptance required |

Existing subscription and blockchain-payment features are maintained separately and do not count as project budgeting or expenditure.

### South Sudan basin scope

| Basin | Operator | Current platform data |
|---|---|---|
| Unity Basin | Greater Pioneer Petroleum Operating Company (GPOC) | Awaiting field and well data |
| Paloch Basin | Dar Petroleum Operating Company (DPOC) | Awaiting field and well data |
| Tharjaath Basin | Sudd Petroleum Operating Company (SPOC) | Tharjaath and Mala fields; 55 wells routed through six OGMs to Tharjaath CPF |

The Tharjaath inventory contains 28 wells across `OGM1` to `OGM5`; Mala contains 27 wells through `OGM Mala`. PCP wells use the `TJ` and `ML` prefixes, while ESP wells use `TJH` and `MLH`. Unity and Paloch remain intentionally empty until controlled source data is supplied.

### Operator workspaces and access

Authenticated users enter through `/workspaces` and can open only the operating-company workspace assigned to their account. SPOC users enter the yellow Tharjaath workspace, DPOC users enter the gray Paloch workspace, and GPOC users enter the light-blue Unity workspace. Administrators can enter all three workspaces.

Operator assignment is controlled from `/admin/users`. Creating a non-administrator requires an `SPOC`, `DPOC`, or `GPOC` assignment; changing the assignment invalidates existing sessions. Direct workspace URLs are guarded in both the React router and the Express API. DPOC and GPOC currently display an empty operational state until their field and well records are supplied.

### Operations dashboard

The primary React dashboard presents the three-basin management structure, a Block 5A field map, and the complete 55-well Tharjaath/Mala inventory. Operators can search and filter wells by field, pump type, status, gathering manifold, and CPF route. A standalone SCADA-oriented interface is also retained in `src/frontend/index.html` for the specialist operational service.

The seeded well topology is authoritative reference data, but the changing production rates, pressures, temperatures, alerts, and online/offline indicators currently shown by the dashboard are demonstration values. They must not be used for operational decisions until the frontend is connected to authenticated field telemetry and the target environment passes the production acceptance checks.

### Current PMS verification baseline

As of 17 August 2026:

- The repository provides authentication, authorization, project, finance, compliance, supply-chain, KPI, training, formal-reporting, and production-readiness tests across ten API test files.
- The release workflow validates a clean dependency installation, production dependency audit, Prisma generation, PostgreSQL migrations, idempotent seed, tests, TypeScript checks, production builds, and both container images.
- The clean-checkout test contract builds the shared and database workspaces before starting Vitest; the latest local Node 22 validation passes all 103 API tests, TypeScript checks, and production builds after the basin and operations-dashboard updates.
- GitHub Actions release validation [run 4](https://github.com/davelee001/SMART-Oil-Field/actions/runs/31691254107) for commit `f33843e` passes clean installation, dependency audit, Prisma generation, migrations, seed, all 103 tests, type checks, production builds, and both container-image builds.
- The production dependency audit has no high or critical findings. Two moderate findings remain in ExcelJS's transitive `uuid` dependency and require tracked risk acceptance or an upstream-compatible remediation.
- Deployment remains staging-ready until the live infrastructure and business checks in `docs/PRODUCTION_ACCEPTANCE.md` are completed.

## PMS Foundation (Phase 1)

The operational PMS foundation is a monorepo composed of the React frontend, an Express API, shared TypeScript contracts, and a Prisma/PostgreSQL data layer. Existing FastAPI telemetry, oil movement, analytics, machine-learning, TypeScript gateway, and Aptos Move services remain in place as specialist services; Phase 1 does not remove or replace them.

Authentication is now database-backed and uses bcrypt password hashing plus signed HS256 JWT access tokens. The browser receives the JWT in an HTTP-only, SameSite cookie and never stores credentials or tokens in local storage. API clients may use the returned token as `Authorization: Bearer <token>`. Every protected API request reloads the user from PostgreSQL to enforce current account status, role, and token revocation version.

Supported PMS roles are:

- Administrator
- Project Manager
- Monitoring and Evaluation Officer
- Compliance Officer
- Finance Officer
- Supply Chain Officer
- Department Head
- Viewer

Only Administrators can access `/admin/users` and `/api/admin/users` to create accounts, assign roles, and enable or disable users. Disabling an account or changing its role invalidates previously issued operational API tokens.

### PMS setup

1. Copy `.env.example` to `.env` and set a unique `JWT_SECRET` of at least 64 characters, plus a strong `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Set `OPERATIONAL_API_URL` for a locally running PMS API and `DOCKER_OPERATIONAL_API_URL` for the Compose API when KPI connectors need telemetry or analytics data.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install dependencies and generate Prisma: `npm install` then `npm run db:generate`.
4. Set `DATABASE_URL`, then apply all PostgreSQL migrations with `npm run db:migrate` for development or `npm run db:migrate:deploy` in controlled environments.
5. Create or promote the initial administrator: `npm run db:seed`.
6. Start the API with `npm run dev:api` and the frontend with `npm run dev:web`.

Validate the PMS workspace with:

```bash
npm test
npm run typecheck
npm run build
```

The default local URLs are `http://localhost:3001` for the frontend and `http://localhost:4000` for the PMS API. PostgreSQL is exposed on host port `5433` by default to avoid conflicts; services inside Docker use port `5432`.

`GET http://localhost:4000/health/live` confirms that the Express process is running. `GET http://localhost:4000/health/ready` only succeeds when PostgreSQL is reachable and migrations have been applied. The specialist FastAPI service runs separately on `http://localhost:8000`; start it with `src/python_api/run.ps1` after installing its Python dependencies.

The KPI connector defaults are `http://localhost:8000` for a locally running PMS API and `http://host.docker.internal:8000` for the Compose API. Connector definitions accept only relative `/api/telemetry`, `/api/analytics`, or `/api/aggregation` paths; synchronized values enter the normal verification workflow rather than becoming approved results automatically.

See [docs/PMS_ROADMAP.md](docs/PMS_ROADMAP.md) for phase boundaries and [docs/MONOREPO_AUTH.md](docs/MONOREPO_AUTH.md) for authentication details.

## PMS Project Management (Phase 2)

Project management is implemented as a domain separate from oil-batch movement. The `/projects` workspace and `/api/projects` API manage project title, code, department, location, manager, dates, status, progress, objectives, activities, milestones, deliverables, risks, and assigned staff. Oil batches continue to represent physical supply-chain movement and are not treated as projects.

All authenticated users can read project records. Administrators and Department Heads can manage every project. Project Managers can create projects assigned to themselves and manage projects for which they are the designated manager. Only Administrators can delete entire projects. See [docs/PMS_PROJECT_MANAGEMENT.md](docs/PMS_PROJECT_MANAGEMENT.md).

## PMS Budgeting and Finance (Phase 4)

The `/finance` workspace and `/api/finance` API provide annual project budgets, category allocations, funding sources, financial reporting periods, commitments, actual expenditure, supporting-document references, and auditable submission/approval workflows. Balances, variance, outstanding commitments, and utilization are calculated from approved finance records rather than subscription payments.

Finance Officers and Administrators review budgets and finance entries. Project Managers can prepare and submit budgets for projects they manage, Department Heads can manage project finance records, and other authenticated roles have reporting access. Four-eyes checks prevent users from approving their own submissions, closed reporting periods reject new entries, and allocation controls prevent approvals beyond an approved category ceiling. See [docs/PMS_BUDGETING_FINANCE.md](docs/PMS_BUDGETING_FINANCE.md).

## PMS Compliance and Regulation (Phase 5)

The `/compliance` workspace and `/api/compliance` API provide the oil-sector regulation register, obligations, licences and permits, inspections, secure evidence references, weighted compliance scoring, non-conformities, corrective actions, escalation, workflow history, and an authenticated regulatory CSV export.

Compliance Officers and Administrators control master records, verification, closure, and escalation. Department Heads and Project Managers can contribute assigned obligations, findings, corrective actions, and evidence. Existing audit, telemetry, and blockchain records remain separate technical foundations and are not treated as a substitute for the compliance business module. See [docs/PMS_COMPLIANCE_REGULATION.md](docs/PMS_COMPLIANCE_REGULATION.md).

The compliance dashboard is available at `/compliance`; its protected API is mounted at `/api/compliance`, and the authenticated regulatory-register export is `GET /api/compliance/reports/register.csv`.

## PMS Supply Chain and Supplier Performance (Phase 6)

The `/supply-chain` workspace and `/api/supply-chain` API provide an oil-sector supplier register, upstream/midstream/downstream classification, qualification, contracts, purchase requests, delivery acceptance, secure evidence references, expiry alerts, workflow history, and supplier-performance scoring across quality, delivery, HSE, local content, and cost.

Supply Chain Officers and Administrators control suppliers, qualification decisions, contracts, and performance reviews. Project Managers and Department Heads can prepare procurement requests and record deliveries. Four-eyes controls prevent supplier registrants from deciding their own qualification and prevent requesters from approving their own purchase requests. Existing oil-batch movement and blockchain provenance remain unchanged specialist services; PMS projects can link to supplier contracts and requests without duplicating those records. See [docs/PMS_SUPPLY_CHAIN.md](docs/PMS_SUPPLY_CHAIN.md).

The authenticated supplier CSV export is `GET /api/supply-chain/reports/suppliers.csv`.

## PMS KPI and Performance Engine (Phase 7)

The `/performance` workspace and `/api/kpis` API provide project-linked results frameworks, impact/outcome/output hierarchies, configurable KPI definitions, baselines, final and period targets, reporting periods, actuals, secure evidence, M&E verification, workflow history, weighted portfolio scoring, reporting completeness, and an authenticated performance export.

Administrators and Monitoring and Evaluation Officers govern definitions, targets, connectors, verification, and period approval. Assigned Project Managers and Department Heads report project results. Four-eyes controls prevent self-verification and self-approval, while period completeness rules require verified results for every active KPI. The dashboard surfaces pending verification alongside reporting gaps and overdue periods. Approved telemetry and analytics paths may be synchronized through `OPERATIONAL_API_URL`; synced values still require independent verification. Existing analytics APIs remain unchanged. See [docs/PMS_KPI_PERFORMANCE.md](docs/PMS_KPI_PERFORMANCE.md).

Verified KPI achievement is classified as on track at 90 percent or above, at risk from 70 to 89.9 percent, and off track below 70 percent. Indicators without verified measurements remain explicitly not reported and reduce the reporting-completeness rate.

The authenticated KPI CSV export is `GET /api/kpis/reports/performance.csv`.

## PMS Training and Capacity Building (Phase 8)

The `/training` workspace and `/api/training` API provide persistent staff departments, competency profiles, a governed course catalogue, course competency outcomes, role/department requirements, project-linked sessions, participant nominations, capacity controls, proportional attendance, assessments, completion, independently verified certifications, expiry monitoring, secure evidence, and auditable workflow history.

Administrators and Department Heads govern the catalogue, competency assessments, requirements, approvals, and certifications. Project Managers coordinate their own sessions and may link only projects they manage. Four-eyes controls prevent session self-approval and certificate self-verification. Completion requires at least 75 percent attendance and a post-training assessment; course-linked certificate expiry is derived automatically when the course defines a validity period.

The dashboard reports workforce compliance, skills gaps, upcoming sessions, completion, training hours, expiring certifications, effectiveness, and cost. The authenticated compliance export is `GET /api/training/reports/compliance.csv`. See [docs/PMS_TRAINING_CAPACITY.md](docs/PMS_TRAINING_CAPACITY.md).

### Phase 8 operator quick start

| Capability | Location | Authorized roles |
|---|---|---|
| Training dashboard and register | `/training` | All authenticated users can view |
| Courses, competencies, requirements, and staff assessments | `/training` and `/api/training` | Administrator and Department Head |
| Session planning, nominations, attendance, and assessments | `/training` and `/api/training` | Administrator, Department Head, and responsible Project Manager |
| Session approval and certificate verification | `/api/training/*/decision` and `/api/training/certifications/:id/verify` | Administrator and Department Head, with four-eyes separation |
| Workforce compliance export | `/api/training/reports/compliance.csv` | All authenticated users |

For an existing installation, apply the Phase 8 schema and verify the complete PMS workspace:

```bash
npm run db:migrate:deploy
npm test
npm run typecheck
npm run build
```

The migration is `20260810092541_training_capacity_building`. Production evidence references must use HTTPS, completed enrollments require at least 75 percent attendance plus a post-training assessment, and certificates issued from a course inherit its configured validity when an explicit expiry is not supplied.

## PMS Formal Reporting and Analytics (Phase 9)

The `/reports` workspace and `/api/reports` API generate governed project, quarterly, annual, finance, compliance, supplier, training, department, and executive reports from live PMS source records. Nine system templates are installed through the secure seed command; Administrators and M&E Officers can prepare additional templates for independent activation.

Each report retains its project or department scope, reporting period, point-in-time cross-module snapshot, evidence metrics, narrative, immutable versions, workflow history, and SHA-256 checksum. Authors cannot approve or sign their own submissions. Domain reviewers provide assurance before Administrator or Department Head sign-off, publication, and controlled archival.

Approved formal outputs are available as print-ready A4 HTML, generated PDF, generated Excel workbooks, and authenticated CSV evidence exports. Every output identifies its reference, version, approver, signatory, and integrity checksum. See [docs/PMS_FORMAL_REPORTING.md](docs/PMS_FORMAL_REPORTING.md).

### Phase 9 quick start

Set `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then install the reporting schema and controlled templates before starting the application:

```bash
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run dev:api
npm run dev:web
```

Sign in with the seeded administrator and open `/reports`. Administrators can maintain templates and archive published records; Project Managers and Department Heads can prepare reports for their authorized scope; M&E and relevant domain officers provide independent review; and Administrators or Department Heads provide final sign-off. The API prevents an author from approving or signing the same report.

The controlled lifecycle is `DRAFT → SUBMITTED → APPROVED → SIGNED → PUBLISHED → ARCHIVED`. A rejection preserves the submitted version and requires a new immutable revision. Before distributing an export, verify that its displayed SHA-256 checksum matches the stored report version.

## PMS Production Readiness (Phase 10)

Phase 10 adds a GitHub Actions release gate, high/critical production dependency auditing, API and frontend container builds, a private PostgreSQL production topology, one-shot migration and seed execution, health-gated startup, API request correlation, authentication throttling, strict production configuration validation, graceful shutdown, and hardened Nginx delivery. The vulnerable legacy Excel package was replaced with ExcelJS, jsPDF and React Router were upgraded, and both dashboard and controlled-report exports remain available.

Run `npm run release:check` with `DATABASE_URL` set to an isolated validation database. This gate performs the production dependency audit, Prisma generation, migrations, seed, tests, TypeScript checks, and production build. Use `npm run release:check:containers` with all required production variables set to also validate the production Compose configuration and build the API and frontend images. Required container-gate variables are `POSTGRES_PASSWORD`, `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `FRONTEND_ORIGIN`, and a `JWT_SECRET` of at least 64 characters; the public origin must use HTTPS.

Deploy with `docker compose -f docker-compose.production.yml up -d`, then run the authenticated smoke gate against the public HTTPS endpoint:

```powershell
./scripts/smoke-test.ps1 -BaseUrl https://pms.example.com -RequireAuthentication
```

The smoke gate verifies the web endpoint, JSON API liveness and database readiness through Nginx, administrator login, and persistent cookie authentication. PostgreSQL backup and restore use `scripts/backup-postgres.ps1` and `scripts/restore-postgres.ps1`, including SHA-256 verification and explicit destructive-restore confirmation.

Repository validation cannot substitute for infrastructure acceptance. TLS, DNS, monitoring, off-host backup transfer, timed restore drills, specialist-service connectivity, and business sign-off must be completed in the target environment using [the deployment runbook](docs/DEPLOYMENT_RUNBOOK.md) and [production acceptance record](docs/PRODUCTION_ACCEPTANCE.md). User operations are documented in [the user manual](docs/USER_MANUAL.md), and privileged procedures are documented in [the administrator manual](docs/ADMINISTRATOR_MANUAL.md).

## Overview

This project integrates multiple technologies:
- **IoT & SCADA**: Real-time telemetry from oilfield sensors with WebSocket streaming
- **RESTful APIs**: FastAPI (Python) and Express (TypeScript) with comprehensive endpoints
- **Blockchain**: Aptos Move smart contracts for immutable records
- **Operational Interfaces**: React PMS dashboard plus the standalone SCADA-oriented portal
- **Data Analytics**: Time-series DB, warehouse, ML predictions, anomaly detection, and backup/DR
- **Advanced Features**: Predictive analytics, alerting system, audit logging, and real-time monitoring

### Quick Feature Summary

| Category | Features |
|----------|----------|
| PMS Identity | PostgreSQL users, bcrypt passwords, JWT HTTP-only sessions, eight organizational roles, route protection, and administrator user management |
| Project Management | Projects, objectives, activities, milestones, deliverables, risks, progress, and assigned staff |
| Budgeting & Finance | Annual budgets, categories, funding sources, periods, commitments, expenditure, calculated balances, document references, and approval workflows |
| Compliance & Regulation | Regulations, policies, obligations, permits, inspections, evidence, scoring, findings, corrective actions, escalation, and regulatory export |
| Supply Chain | Supplier registry, qualification, contracts, purchase requests, delivery acceptance, evidence, expiry alerts, five-dimension performance scoring, and supplier export |
| KPI Performance | Results frameworks, impact/outcome/output hierarchy, baselines, period targets, actuals, evidence, weighted achievement, M&E verification, controlled operational connectors, and performance export |
| Training & Capacity | Staff departments, competency profiles, courses, requirements, sessions, attendance, assessments, certifications, expiry, effectiveness, costs, evidence, approvals, and compliance export |
| Formal Reporting | Controlled templates, cross-module snapshots, immutable versions, approval, sign-off, publication, archive, PDF, Excel, print-ready HTML, and integrity checks |
| Telemetry | Real-time sensor data ingestion, WebSocket streaming, querying, statistics, CSV export, async tasks |
| Oil Tracking | Dual-mode (DB + Blockchain), 7 lifecycle stages, GPS tracking, quality monitoring |
| Subscriptions | Multi-token payments (APT, USDC, USDT), seasonal discounts (30%), promo codes, referral rewards (10%), loyalty rewards (15%), grace period (5 days), pro-rated refunds, installment plans |
| Blockchain | Aptos Move smart contracts, immutable records, event tracking, ownership transfer |
| Notifications | Subscription expiration reminders with 3 severity levels, email/SMS alerts |
| Operations UI | Basin management, Block 5A map, searchable 55-well inventory, OGM/CPF routing, operational summaries, and protected internal routing; changing SCADA values remain simulated until telemetry integration is completed |
| Analytics | InfluxDB time-series, DuckDB warehouse, ML anomaly detection, predictive analytics, trend analysis |
| Data Science | Ensemble ML models, advanced feature engineering, real-time stream processing, production optimization, comprehensive ETL with data quality validation |
| Machine Learning | Multi-algorithm anomaly detection, predictive maintenance, time series forecasting, automated training pipeline, synthetic data generation |
| Monitoring | Real-time WebSocket connections, anomaly detection, alerting system, audit logging |
| Data Management | Batch CSV upload, data validation schemas, aggregation by time buckets, historical trends |

## Project Components

- **Python API**: FastAPI service with CORS enabled for telemetry ingestion, querying, subscription management, oil tracking, and CSV export. See [src/python_api/README.md](src/python_api/README.md).
- **TypeScript Backend**: Express + TypeScript API gateway with full proxy coverage for all Python API endpoints (telemetry, subscriptions, oil tracking). See [src/ts_backend/README.md](src/ts_backend/README.md).
- **Data Science Suite**: Comprehensive ML and analytics platform with ensemble models, real-time stream processing, advanced feature engineering, production optimization, and ETL pipelines with data quality validation. See [src/data_science/](src/data_science/).
- **Move Subscriptions**: Aptos Move package for blockchain-based subscription management with payment processing, discount codes, seasonal promotions, and referral rewards. See [blockchain/move/subscriptions](blockchain/move/subscriptions).
- **Move Oil Tracker**: Aptos Move module for immutable, blockchain-verified oil batch tracking with ownership transfer and lifecycle events. See [blockchain/move/oil_tracker](blockchain/move/oil_tracker).
- **Frontend Dashboard**: React TypeScript application with Material-UI components, basin management, the Tharjaath/Mala well topology, operational summaries, interactive maps, dark/light mode, protected PMS routes, and PWA capabilities. See [src/frontend/](src/frontend/).

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

### 🖥️ Modern React Frontend
- **React TypeScript**: Modern component-based architecture with type safety
- **Material-UI Design System**: Consistent, professional UI components with theme support
- **Dark/Light Mode**: Seamless theme switching with system preference detection
- **Responsive Design**: Mobile-first design that works on all screen sizes
- **Real-time Charts**: Interactive data visualization using Chart.js and react-chartjs-2
- **Interactive Maps**: Leaflet-based maps for oil field location visualization
- **PWA Capabilities**: Progressive Web App features for offline functionality
- **Smooth Animations**: Framer Motion animations for enhanced user experience
- **Toast Notifications**: Real-time feedback with react-toastify
- **Loading States**: Skeleton screens and loading indicators for better UX
- **Data Export**: PDF (jsPDF) and Excel (xlsx) export of the filtered well report
- **Search & Filtering**: Live search plus quick filters (All/Active/Warnings/Last 24h) wired to well data and summary stats
- **WebSocket Integration**: Real-time updates via WebSocket connections
- **State Management**: React Query for efficient data fetching and caching
- **Modern Build System**: Webpack configuration with hot reloading and TypeScript support

### 👤 Account, Subscriptions & Payments (Frontend)
- **User Authentication UI** (`/login`): Login/register form backed by PostgreSQL, bcrypt, and JWT authentication
- **Profile Management** (`/profile`): View/edit name, email, and Aptos wallet address; logout
- **Subscription Management Dashboard** (`/subscriptions`): Plan cards (Basic/Pro/Enterprise), subscribe/cancel actions, current plan status
- **Discount Code Redemption**: Promo code entry embedded in the Subscriptions page, applies a live discount to plan pricing
- **Payment History** (`/payment-history`): Table of past subscription payments with status and linked Aptos Explorer transaction hash
- Sidebar and Navbar updated with working navigation links (including a profile avatar) to all of the above
- Authentication and user administration use the PMS API. Subscription and payment demonstrations remain separate from identity and will be integrated in a later approved phase.

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

## Recent Updates (v0.8.0)

### Public Website, Design System & Layout Optimization

**Public Landing Page (`/`)**:
- Created a dedicated public website (`Home.tsx`) introducing the SMART Oil Field project to visitors and operators
- High-impact Hero section with live operations snapshot card, core capabilities grid, architecture stack breakdown, pricing plan teasers, FAQ accordion, and newsletter subscription form
- Integrated router update in `App.tsx` placing public landing page at `/` and moving operational dashboard to `/dashboard`

**Design System & UI/UX Refinements**:
- **Theme & Colors**: Established industrial color palette (`#0f2027` ➔ `#203a43` gradients, primary `#1e3c72`) with dark top Navbar and clear active Sidebar navigation states
- **Accessibility**: Added focus-visible keyboard rings and high-contrast text ratios across Material-UI components
- **Compact Layouts**: Optimized padding, typography scale, and card heights so content fits comfortably across standard screens without excessive vertical scrolling

## Recent Updates (v0.7.0)

### Frontend: Account, Subscriptions & Dashboard Interactivity

**Dashboard**:
- Search box and quick-filter buttons (All Wells/Active Only/Warnings/Last 24h) now filter a live well dataset instead of static mock numbers
- Summary stat cards and the new Well Details table recompute from the filtered results
- Real PDF (jsPDF) and Excel (xlsx) export of the currently filtered wells
- Toast notifications (react-toastify) for applied filters and export results

**New Public Website & Account Pages (v0.8.0)**:
- `Home` (`Home.tsx`): Clean, modern public landing page showcasing SMART Oil Field features, architecture preview, pricing teasers, live metrics, FAQ accordion, and newsletter subscription.
- `Navbar`: Dedicated top navigation with dark/light mode toggle and top-right **Sign In** and **Sign Up** action buttons for seamless onboarding.
- `Sidebar`: Clean navigation menu without intrusive visual clutter or lock icons, offering direct links to public and operational areas.
- `Login` page with PostgreSQL-backed registration/login, bcrypt password verification, and JWT authentication through an HTTP-only cookie.
- `Profile` page for viewing/editing user details and wallet address.
- `Subscriptions` page with plan cards, subscribe/cancel actions, and embedded discount code redemption.
- `PaymentHistory` page listing past payments with Aptos Explorer transaction links.
- `ProtectedRoute` guards operational pages including `/dashboard`, `/projects`, `/finance`, `/compliance`, `/profile`, `/subscriptions`, `/payment-history`, and role-restricted `/admin/users`, while the landing page remains public.

## Recent Updates (v0.8.0)

### Major Feature Enhancements

**Public Website Suite & Onboarding UX**:
- **Public Landing Page**: Created full-featured `Home.tsx` with Hero presentation, Live Operations snapshot, metrics bar, capability grid, full-stack architecture preview, tier pricing teaser, FAQ, and newsletter.
- **Uncluttered Navigation**: Removed lock icons from public view lists while maintaining robust, seamless client-side protection via `ProtectedRoute.tsx`.
- **Primary Auth Calls-to-Action**: Added prominent "Sign In" and "Sign Up" action buttons in the global `Navbar.tsx` for easy user access.

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

## 🧠 Advanced Data Science & ML Suite

### 📊 Comprehensive ML Models
- **Ensemble Anomaly Detection**: Multi-algorithm approach combining Isolation Forest, DBSCAN, and statistical methods for robust outlier detection with confidence scoring
- **Predictive Maintenance**: LightGBM-based machine learning model for equipment failure prediction with feature importance analysis
- **Production Forecasting**: Advanced time series forecasting using gradient boosting with multi-step ahead predictions
- **Model Management**: Centralized training, validation, and deployment pipeline with automated model versioning

### 🔧 Advanced Feature Engineering
- **TelemetryFeatureEngineer**: Sophisticated feature extraction pipeline including:
  - Time-based features (cyclical encoding, business hours, seasonal patterns)
  - Rolling window statistics (mean, std, min, max, median, z-scores)
  - Fourier transform features for cyclical pattern detection
  - Rate of change and deviation calculations
  - Cross-feature relationship modeling
- **Production Optimization**: ML-driven analytics for optimal parameter recommendations with efficiency scoring
- **Real-time Processing**: Stream-compatible feature engineering for live data analysis

### 🌊 Real-Time Stream Processing Engine
- **Configurable Stream Processors**: Modular architecture with pluggable processors for:
  - Real-time anomaly detection with 3-sigma rule implementation
  - Threshold monitoring with configurable alert levels
  - Trend analysis with linear regression and pattern detection
- **Device Health Monitoring**: Comprehensive health scoring with stability metrics and alert correlation
- **Stream Analytics**: System-wide insights with device aggregation and real-time dashboards
- **Event Buffering**: Circular buffer implementation for efficient memory usage and historical context

### 🏗️ Enhanced ETL Pipeline with Data Quality
- **Data Quality Validation Engine**: Comprehensive rule-based validation with:
  - Range validation for sensor readings
  - Null value detection and handling
  - Uniqueness constraints and duplicate detection
  - Custom validation rules with severity levels
- **Multi-Source Data Extraction**: Support for SQLite, CSV, and extensible for future data sources
- **Advanced Transformations**: 
  - Outlier detection and capping using IQR methods
  - Missing value imputation strategies
  - Data type optimization and categorical encoding
  - Feature engineering integration
- **Data Warehouse Operations**: DuckDB-based analytics warehouse with:
  - Automated aggregations (hourly, daily, device-level)
  - Parquet export for BI tools (Power BI, Tableau)
  - Health summary tables and device analytics
- **Quality Scoring**: Automated data quality assessment with detailed reporting

### 📈 Production Analytics & Optimization
- **Parameter Optimization**: ML-driven recommendations for optimal operating ranges based on historical performance
- **Efficiency Scoring**: Multi-factor analysis considering stability, performance, and operational metrics
- **Production Insights**: Advanced analytics for:
  - Equipment degradation patterns
  - Optimal temperature and pressure ranges
  - Maintenance scheduling recommendations
  - Performance benchmarking across devices

### 🔄 Comprehensive Training Pipeline
- **Enhanced Synthetic Data Generation**: Realistic telemetry simulation with:
  - Daily temperature cycles and equipment degradation trends
  - Multiple anomaly types (spikes, drift, oscillations)
  - Device-specific patterns and failure modes
  - Configurable sample sizes and device counts
- **Multi-Model Training**: Automated pipeline for training all models with:
  - Cross-validation and hyperparameter optimization
  - Model performance evaluation and comparison
  - Feature importance analysis and selection
  - Automated model saving and versioning
- **Comprehensive Reporting**: Detailed training reports including:
  - Model performance metrics (accuracy, RMSE, feature importance)
  - Data quality assessments
  - Training duration and resource usage
  - Production optimization recommendations
- **Legacy Compatibility**: Backward-compatible model formats for existing API integrations

### 📦 Data Science Dependencies
- **Advanced ML Libraries**: LightGBM, XGBoost, Prophet for time series, Optuna for hyperparameter tuning
- **Stream Processing**: Kafka, Redis, WebSockets for real-time data pipelines
- **Deep Learning**: TensorFlow, PyTorch, PyTorch Lightning for advanced modeling
- **Data Quality**: Great Expectations, Pandera, Evidently for monitoring and validation
- **Visualization**: Plotly, Bokeh, Seaborn for advanced analytics dashboards
- **Database & Storage**: DuckDB for analytics, PyArrow for Parquet, SQLAlchemy for ORM

### 🚀 Getting Started with Data Science
```bash
# Install data science dependencies
cd src/data_science
pip install -r requirements.txt

# Run enhanced ML training pipeline
python scripts/train_ml.py

# Run ETL pipeline with data quality validation
python src/data_science/pipelines/enhanced_etl.py

# Start stream processing (example)
python -c "
from src.data_science.pipelines.stream_processing import StreamProcessor
processor = StreamProcessor()
# Add processors and start processing
"
```

### 📋 Data Science Modules
- **[src/data_science/](src/data_science/)**: Main data science package
- **[models/ml_models.py](src/data_science/models/ml_models.py)**: Comprehensive ML model implementations
- **[pipelines/feature_engineering.py](src/data_science/pipelines/feature_engineering.py)**: Advanced feature engineering pipeline
- **[pipelines/stream_processing.py](src/data_science/pipelines/stream_processing.py)**: Real-time stream processing engine
- **[pipelines/enhanced_etl.py](src/data_science/pipelines/enhanced_etl.py)**: ETL pipeline with data quality validation
- **[scripts/train_ml.py](scripts/train_ml.py)**: Enhanced training pipeline with synthetic data generation

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

### PMS Management Features
- Persistent PostgreSQL user accounts with bcrypt password hashing and JWT authentication
- Role-based access for Administrator, Project Manager, Monitoring and Evaluation Officer, Compliance Officer, Finance Officer, Supply Chain Officer, Department Head, and Viewer
- Administrator account, role, and active-status management
- Project planning with objectives, activities, milestones, deliverables, risks, progress, and staff assignments
- Annual project budgets with category allocations, funding sources, and financial reporting periods
- Oil-sector supplier registration, qualification, contracts, purchase requests, delivery acceptance, and secure evidence
- Five-dimension supplier performance scoring across quality, delivery, HSE, local content, and cost
- Four-eyes supplier-qualification and procurement approvals with expiry, late-delivery, and below-standard alerts
- Results frameworks, KPI baselines and targets, reporting periods, verified actuals, evidence, direction-aware achievement, and weighted portfolio performance
- Commitment and expenditure workflows with supporting-document references
- Calculated approved allocation, actual expenditure, outstanding commitments, remaining balance, variance, and utilization
- Auditable four-eyes approval controls for budgets and finance entries
- Oil-sector compliance register with weighted scoring, permit expiry monitoring, inspection scheduling, evidence, corrective actions, escalation, and regulatory export

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
- Role-Based Access Control: eight PMS-specific organizational roles with backend and frontend enforcement
- Async Task Processing: Celery-based background job processing

## Future Enhancements

### PMS Roadmap
- [x] **Phase 6 — Supplier Performance**: Supplier registration, qualification, contracts, purchase requests, deliveries, HSE/local-content indicators, performance scoring, workflow controls, and authenticated export
- [x] **Phase 7 — KPI Engine**: Results frameworks, configurable indicators, baselines, targets, actuals, evidence, weighting, verification, reporting periods, controlled operational connectors, and authenticated export
- [x] **Phase 8 — Training and Capacity Building**: Competencies, courses, requirements, sessions, participants, attendance, assessments, verified certificates, costs, effectiveness, and skills gaps
- [x] **Phase 9 — Formal PMS Reports**: Controlled project, quarterly, annual, finance, compliance, supplier, training, departmental, and executive reports with approval, sign-off, immutable versions, and formal outputs
- [x] **Phase 10 — Production Readiness**: Automated release/security validation, CI, production containers, PostgreSQL recovery, deployment smoke tests, and user/administrator manuals; live-environment acceptance remains required

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
