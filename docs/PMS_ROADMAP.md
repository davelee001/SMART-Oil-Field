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

## Phase 4 — Budgeting and finance (implemented)

- Annual project budgets, category allocations, and funding sources
- Approved allocation, commitments, actual expenditure, remaining balance, variance, and utilization reporting
- Financial reporting periods and secure supporting-document references
- Finance Officer and Administrator review workflows with four-eyes approval controls
- Deliberate separation from subscription billing and blockchain payment records

## Phase 7 — KPI and performance dashboards (approval required)

- Results frameworks, indicators, baselines, targets, reporting periods, and evidence
- Automated KPI inputs from existing telemetry and analytics where appropriate
- M&E review and approval workflow

## Phase 5 — Compliance and regulation (approval required)

- Obligations, inspections, findings, corrective actions, evidence, and due dates
- Compliance dashboards and auditable approvals
- References to immutable blockchain records where regulatory provenance is required

## Phase 6 — Supply chain and supplier performance (approval required)

- Supplier registry, qualification, contracts, purchase requests, delivery tracking, and performance
- Connections to existing oil-movement provenance without duplicating blockchain records

## Phase 8 — Training and capacity building (approval required)

- Competency profiles, course catalogue, attendance, certifications, and expiry reminders
- Role and department-based training requirements

## Phase 9 — Reporting and analytics (approval required)

- Formal project, quarterly, annual, finance, compliance, supplier, training, department, and executive reports
- Approval, sign-off, and controlled report templates

## Phase 10 — Finalization and deployment (approval required)

- Full-system automated testing, security validation, CI/CD, production deployment, backup and restoration testing
- User and administrator manuals plus live-environment acceptance

## Cross-cutting constraints

- Existing telemetry, oil tracking, analytics, ML, blockchain, and subscription interfaces remain supported.
- New modules must use the Phase 1 identity and RBAC contracts.
- PostgreSQL is the PMS system of record; specialist time-series, analytics, and blockchain stores retain their domain responsibilities.
- Every phase requires migrations, authorization tests, auditability, documentation, and regression checks before release.
