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

Portfolio hierarchy, programme aggregation, and direct asset links remain future work and require separate approval.

## Phase 3 — Integration and operational continuity (implemented)

- Existing telemetry, oil movement, analytics, machine-learning, blockchain, and subscription interfaces retained
- PMS modules use the shared Phase 1 identity and authorization contracts
- Operational and management-system records remain separated by their domain ownership boundaries
- Protected FastAPI write operations use shared JWT validation without replacing specialist services

Phase 3 is a cross-cutting integration phase. It introduced no standalone PMS module or new system of record.

## Phase 4 — Budgeting and finance (implemented)

- Annual project budgets, category allocations, and funding sources
- Approved allocation, commitments, actual expenditure, remaining balance, variance, and utilization reporting
- Financial reporting periods and secure supporting-document references
- Finance Officer and Administrator review workflows with four-eyes approval controls
- Deliberate separation from subscription billing and blockchain payment records

## Phase 7 — KPI and performance dashboards (implemented)

- Project-linked results frameworks with impact, outcome, and output hierarchies
- Configurable indicators, baselines, final and period targets, direction, weighting, frequency, formula notes, and disaggregation dimensions
- Governed reporting periods, actual measurements, secure evidence, completeness checks, and auditable M&E verification
- Direction-aware achievement, weighted portfolio performance, reporting rate, and on-track/at-risk/off-track classification
- Allow-listed automated inputs from existing telemetry and analytics endpoints with sync status and error reporting
- Authenticated KPI performance export without replacing existing operational analytics

## Phase 5 — Compliance and regulation (implemented)

- Oil-sector regulation and policy register with jurisdictions, regulators, effective dates, and review dates
- Obligations, licences, permits, inspections, evidence, responsible officers, and due dates
- Weighted compliance scoring, non-conformities, corrective-action plans, escalation, and auditable verification
- Authenticated regulatory-register export; future formal report templates remain Phase 9 work
- Existing blockchain records may be linked as evidence without duplicating or expanding payment features

## Phase 6 — Supply chain and supplier performance (implemented)

- Supplier registry with upstream, midstream, downstream, and cross-sector classification
- Qualification scoring, expiry monitoring, secure evidence, and four-eyes decisions
- Project-linked supplier contracts, purchase requests, approval controls, and delivery acceptance
- Quality, delivery, HSE, local-content, and cost performance scoring with auditable workflow history
- Authenticated supplier-register export and operational dashboard alerts
- Existing oil-movement and blockchain provenance remain unchanged and are not duplicated

## Phase 8 — Training and capacity building (implemented)

- Persistent staff departments, competency profiles, target proficiency, and skills-gap analysis
- Course catalogue, competency mappings, role/department requirements, delivery modes, validity, and cost controls
- Project-linked sessions, capacity limits, nominations, proportional attendance, assessments, and completion rules
- Four-eyes session approval and certificate verification with workflow and audit history
- Certification expiry, role/department compliance, learning-effectiveness, training-hour, and cost analytics
- Secure evidence references and authenticated workforce-compliance export

## Phase 9 — Reporting and analytics (implemented)

- Formal project, quarterly, annual, finance, compliance, supplier, training, department, and executive reports
- Controlled system and custom templates with role-based authorship and independent activation
- Live project/department/period snapshots across delivery, finance, KPI, compliance, supplier, and workforce records
- Immutable report versions, SHA-256 integrity checks, secure evidence, and auditable workflow history
- Independent approval, executive sign-off, publication, archive, and separation-of-duties controls
- Print-ready A4 output plus generated PDF, Excel, and authenticated CSV evidence exports

## Phase 10 — Finalization and deployment (implemented; live acceptance required)

- Automated release validation with PostgreSQL migrations, seed, tests, type checks, production builds, dependency audit, and container builds
- Hardened API runtime with separate liveness/readiness probes, request correlation, authentication throttling, safe production configuration enforcement, and graceful shutdown
- Production Compose deployment with private PostgreSQL networking, one-shot migrations, unprivileged API execution, health-gated startup, and a secured Nginx frontend
- Checksum-verified PostgreSQL backup and guarded restore tooling, release checks, and authenticated deployment smoke tests
- Deployment runbook, user manual, administrator manual, and formal production-acceptance record
- Live infrastructure acceptance, restore timing, TLS validation, monitoring integration, and business sign-off remain deployment-environment responsibilities

## Cross-cutting constraints

- Existing telemetry, oil tracking, analytics, ML, blockchain, and subscription interfaces remain supported.
- New modules must use the Phase 1 identity and RBAC contracts.
- PostgreSQL is the PMS system of record; specialist time-series, analytics, and blockchain stores retain their domain responsibilities.
- Every phase requires migrations, authorization tests, auditability, documentation, and regression checks before release.
