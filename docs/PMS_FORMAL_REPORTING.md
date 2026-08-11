# PMS Formal Reporting and Analytics

## Purpose

Phase 9 converts verified PMS records into governed management outputs. It does not replace source modules or silently approve their data. Every report stores a point-in-time source snapshot, structured evidence metrics, narrative, immutable version, SHA-256 checksum, workflow history, and sign-off record.

The protected workspace is `/reports`; the API is mounted at `/api/reports`.

## Controlled report families

The secure seed command installs nine active system templates:

| Code | Report family | Primary scope |
|---|---|---|
| `PMS-PROJECT` | Project performance | One managed project |
| `PMS-QUARTERLY` | Quarterly portfolio | Enterprise reporting period |
| `PMS-ANNUAL` | Annual performance | Enterprise year |
| `PMS-FINANCE` | Financial performance | Budget, commitment and expenditure |
| `PMS-COMPLIANCE` | Compliance and regulatory | Obligations, permits, inspections and findings |
| `PMS-SUPPLIER` | Supplier performance | Qualification, contracts, delivery and scorecards |
| `PMS-TRAINING` | Training and capacity | Competencies, learning, completion and certification |
| `PMS-DEPARTMENT` | Department performance | One organizational department |
| `PMS-EXECUTIVE` | Executive performance brief | Enterprise scorecard and exceptions |

Administrators and M&E Officers can prepare custom templates. A non-system template must be submitted and independently approved by an Administrator before it can generate reports.

## Workflow and separation of duties

Formal reports follow:

`DRAFT → SUBMITTED → APPROVED → SIGNED → PUBLISHED → ARCHIVED`

Reviewers can reject a submitted report. Rejection returns it for a new immutable version; existing versions are never overwritten. Database triggers prevent version updates.

- An author or submitter cannot approve their own report.
- An author or submitter cannot sign their own report.
- Review roles depend on report family: Finance, Compliance and Supply Chain Officers review their domains; M&E Officers review performance-oriented reports; Administrators and Department Heads provide broader assurance.
- Only Administrators and Department Heads sign and publish.
- Only Administrators archive published reports.
- Evidence is locked after submission.

## Source snapshots and integrity

Generation queries the PostgreSQL system of record for the selected project, department and period. The snapshot includes project progress and risk, approved budgets and entries, verified KPI coverage, compliance posture, supplier performance, training completion, competency gaps and verified certifications.

Each version checksum covers:

- executive summary;
- findings;
- recommendations;
- structured report content; and
- the complete source snapshot.

Signature recalculates the checksum and fails if the stored content does not match. PostgreSQL constraints enforce dates, required scopes, workflow identities, approval/signature separation and checksum format.

## Formal outputs

Approved and later-stage reports support:

- print-ready A4 HTML suitable for browser **Print / Save as PDF**;
- generated PDF from the reporting workspace;
- generated Excel workbook with metadata and evidence sheets; and
- authenticated, non-cacheable CSV evidence export.

Outputs display the report reference, version, approver, signatory and SHA-256 checksum. Draft and rejected reports cannot use the server-side formal output endpoints.

## API summary

| Endpoint | Purpose |
|---|---|
| `GET /api/reports/overview` | Reporting workload and publication summary |
| `GET /api/reports/options` | Active templates, projects and departments |
| `GET /api/reports/register` | Templates, reports, immutable versions and workflow history |
| `POST /api/reports/templates` | Create a controlled-template draft |
| `POST /api/reports/templates/:id/submit` | Submit a template |
| `POST /api/reports/templates/:id/decision` | Independently approve or reject a template |
| `POST /api/reports/generate` | Generate version 1 from a live PMS snapshot |
| `POST /api/reports/reports/:id/revise` | Create a new immutable version and refresh its snapshot |
| `POST /api/reports/reports/:id/submit` | Submit a report |
| `POST /api/reports/reports/:id/decision` | Independently approve or reject |
| `POST /api/reports/reports/:id/sign` | Verify checksum and sign |
| `POST /api/reports/reports/:id/publish` | Publish a signed report |
| `POST /api/reports/reports/:id/archive` | Archive a published report |
| `POST /api/reports/evidence` | Attach secure pre-submission evidence |
| `GET /api/reports/reports/:id/render.html` | Render print-ready formal output |
| `GET /api/reports/reports/:id/export.csv` | Export structured evidence |

## Deployment

Apply migrations and install or refresh the controlled templates:

```bash
npm run db:migrate:deploy
npm run db:seed
```

The seed requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`. Validate the complete workspace with:

```bash
npm test
npm run typecheck
npm run build
```

Production operators should restrict report access to named accounts, retain PostgreSQL backups for the full records-retention period, and validate a report checksum before distributing any exported copy. Published records should be archived through the reporting workflow instead of being deleted or altered directly in the database.

Phase 10 remains responsible for CI/CD, security validation, production deployment, backup restoration testing, manuals and live acceptance.
