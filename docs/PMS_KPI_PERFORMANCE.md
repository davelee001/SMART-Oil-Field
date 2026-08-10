# PMS KPI and Performance Engine

Phase 7 introduces the formal monitoring and evaluation layer for SMART Oil Field. PostgreSQL stores governed results frameworks, KPI definitions, targets, reporting periods, actuals, evidence, connector configuration, and workflow history. Existing telemetry and analytics remain specialist operational systems and can provide controlled KPI inputs.

## Results architecture

Each results framework belongs to a PMS project and has an accountable owner, implementation dates, and lifecycle status. A framework may contain hierarchical impact, outcome, and output statements. KPIs can be attached to a result statement or directly to the framework.

Each KPI defines:

- A unique code, precise definition, unit, data type, and reporting frequency
- Desired direction: increase, decrease, or maintain within a configured tolerance
- Baseline value and date, final target, period targets, and portfolio weight
- Formula and source notes plus optional disaggregation dimensions
- An accountable KPI owner and lifecycle status

## Performance calculation

Only verified measurements contribute to performance. Increase indicators compare actual divided by target. Decrease indicators achieve target when actual is at or below target. Maintain indicators receive full achievement within their configured tolerance and decline as the variance grows.

Achievement is classified as:

- `ON_TRACK`: 90 percent or greater
- `AT_RISK`: 70–89.9 percent
- `OFF_TRACK`: below 70 percent
- `NOT_REPORTED`: no verified measurement

The portfolio score is the weighted average of reported active indicators, capped at 100 percent per indicator for portfolio aggregation. The dashboard separately displays reporting completeness so missing results cannot be hidden by high-performing KPIs.

## Workflow and access control

All authenticated users have reporting access. Administrators and Monitoring and Evaluation Officers manage frameworks, results, KPI definitions, targets, periods, operational connectors, verification, and period approval. Assigned Project Managers and Department Heads can report actuals and attach evidence within their authorized project scope.

Measurements follow `DRAFT → SUBMITTED → VERIFIED` or `REJECTED`. Reporting periods follow `OPEN → SUBMITTED → APPROVED` or `REJECTED`. Rejected records may be corrected and resubmitted. A reporter cannot verify their own measurement, and a reporting-period submitter cannot approve their own period. A period cannot be submitted until every active KPI has a verified result.

## Operational data connectors

M&E administrators may configure `TELEMETRY` or `ANALYTICS` connectors for a KPI. Connectors accept only relative paths beneath:

- `/api/telemetry`
- `/api/analytics`
- `/api/aggregation`

The API resolves those paths against `OPERATIONAL_API_URL`, rejects origin changes, enforces a ten-second timeout, extracts numeric values using a configured JSON path, and applies value, average, sum, minimum, maximum, or count aggregation. Synced measurements enter the normal submitted state and still require independent M&E verification. Sync timestamps, last values, and errors are retained for operational visibility.

For local development:

```env
OPERATIONAL_API_URL=http://localhost:8000
```

The Docker Compose API uses the separate `DOCKER_OPERATIONAL_API_URL` setting and defaults to `http://host.docker.internal:8000` so it can reach a host-running Python API. Keeping host and container URLs separate prevents a copied local `.env` file from accidentally resolving the connector back to the API container itself.

## Routes

- Frontend workspace: `/performance`
- Overview: `GET /api/kpis/overview`
- Full register: `GET /api/kpis/register`
- Form options: `GET /api/kpis/options`
- Frameworks and results: `/api/kpis/frameworks`
- KPI definitions: `/api/kpis/indicators`
- Reporting periods and decisions: `/api/kpis/periods`
- Period targets: `PUT /api/kpis/targets`
- Measurements and verification: `/api/kpis/measurements`
- Operational connectors and synchronization: `/api/kpis/data-sources`
- Evidence: `POST /api/kpis/evidence`
- CSV performance register: `GET /api/kpis/reports/performance.csv`

## Database migration

Configure `DATABASE_URL`, then generate the client and deploy all migrations:

```bash
npm run db:generate
npm run db:migrate:deploy
```

The Phase 7 migration is `20260810083222_kpi_performance_engine`.

## Verification

Run the complete quality gate:

```bash
npm test
npm run typecheck
npm run build
```

Phase 7 integration coverage includes RBAC, project-scoped reporting, calculation, measurement dates, independent verification, reporting completeness, period approval, connector allow-listing, secure evidence, and export authentication.
