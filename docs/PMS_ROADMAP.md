# SMART Oil Field PMS roadmap

## Purpose

The PMS extends the existing SMART Oil Field platform without removing telemetry, oil movement tracking, analytics, machine learning, blockchain, or subscription capabilities. Each phase is intentionally bounded so operational technology remains stable while management functions are introduced.

## Phase 1 — PMS foundation (implemented)

- PostgreSQL operational identity database through Prisma
- Persistent user accounts and bcrypt password hashing
- Signed JWT authentication for browsers and service clients
- HTTP-only browser authentication with no local-storage token persistence
- Role-based access control for Administrator, Project Manager, Monitoring and Evaluation Officer, Compliance Officer, Finance Officer, Supply Chain Officer, Department Head, and Viewer
- Administrator user-management interface for account creation, roles, and active/disabled status
- Secure environment-driven initial administrator seed
- Database migrations and authentication audit records
- Unit and HTTP integration tests for authentication and authorization
- Shared JWT validation for protected FastAPI write operations

Phase 1 does not introduce projects, budgets, KPIs, compliance cases, suppliers, or training records.

## Phase 2 — Project management (implemented)

- Dedicated project records with title, code, department, location, manager, dates, status, and progress
- Normalized objectives, activities, milestones, deliverables, risks, and staff assignments
- Role-protected project workspace and REST API
- Project management remains separate from oil-batch supply-chain tracking

Portfolio hierarchy, programme aggregation, project budgeting, KPI frameworks, and direct asset links remain future work and require separate approval.

## Phase 3 — Budget and finance controls (approval required)

- Project budgets, funding sources, commitments, expenditure, and variance reporting
- Finance Officer approval workflows
- Reconciliation links to existing subscription and blockchain payment records

## Phase 4 — KPI and M&E (approval required)

- Results frameworks, indicators, baselines, targets, reporting periods, and evidence
- Automated KPI inputs from existing telemetry and analytics where appropriate
- M&E review and approval workflow

## Phase 5 — Compliance and risk (approval required)

- Obligations, inspections, findings, corrective actions, evidence, and due dates
- Compliance dashboards and auditable approvals
- References to immutable blockchain records where regulatory provenance is required

## Phase 6 — Suppliers and supply chain (approval required)

- Supplier registry, qualification, contracts, purchase requests, delivery tracking, and performance
- Connections to existing oil-movement provenance without duplicating blockchain records

## Phase 7 — Training and competency (approval required)

- Competency profiles, course catalogue, attendance, certifications, and expiry reminders
- Role and department-based training requirements

## Cross-cutting constraints

- Existing telemetry, oil tracking, analytics, ML, blockchain, and subscription interfaces remain supported.
- New modules must use the Phase 1 identity and RBAC contracts.
- PostgreSQL is the PMS system of record; specialist time-series, analytics, and blockchain stores retain their domain responsibilities.
- Every phase requires migrations, authorization tests, auditability, documentation, and regression checks before release.
