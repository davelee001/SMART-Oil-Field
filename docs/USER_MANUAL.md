# PMS user manual

## Access and session safety

Open the organization-provided HTTPS address and sign in with your named account. Do not share credentials or exported reports. Use the password visibility control only where your screen cannot be observed. Sign out when using a shared workstation; administrators can disable compromised accounts immediately.

Your role and department determine which records and actions are available. A missing action normally means the workflow state, ownership, or role does not permit it—not that the record is lost.

## Main workspaces

| Workspace | Purpose |
| --- | --- |
| Dashboard | Operational summary, well search, alerts, production and telemetry |
| Projects | Objectives, activities, milestones, deliverables, risks and assignments |
| Finance | Budgets, allocations, commitments, expenditure and variance controls |
| Compliance | Regulations, obligations, permits, inspections and corrective actions |
| Suppliers & Supply Chain | Supplier qualification, contracting, delivery and performance |
| KPI Performance | Results frameworks, targets, actuals, evidence and verification |
| Training & Capacity | Competencies, courses, attendance, assessment and certification |
| Formal Reports | Controlled reports, evidence, review, sign-off and export |

Existing oil movement, telemetry, analytics, mapping, blockchain provenance, and subscription screens remain available where authorized.

## Standard workflow

1. Create or update a draft within your authorized project or department.
2. Complete required fields and attach HTTPS evidence references.
3. Submit the record for independent review.
4. A designated officer approves or rejects it with a reason.
5. Correct rejected work through the supported revision action; do not overwrite evidence outside the PMS.
6. Use exports only from the controlled workspace and verify identifiers, version, reporting period, and checksum where provided.

Report authors cannot approve or sign their own reports. Formal reports progress through `DRAFT`, `SUBMITTED`, `APPROVED`, `SIGNED`, `PUBLISHED`, and `ARCHIVED`. Rejection preserves the previous version for audit.

## Support information

When reporting a problem, provide the time, page, action, record reference, visible message, and `X-Request-Id` if available. Do not include passwords, JWTs, database URLs, or confidential evidence in screenshots or email.

