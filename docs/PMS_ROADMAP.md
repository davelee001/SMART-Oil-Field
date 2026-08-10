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
