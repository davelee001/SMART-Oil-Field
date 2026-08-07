# PMS compliance and regulation

## Scope

Phase 5 adds a PostgreSQL-backed oil-sector compliance-management domain. Technical API audit logs, telemetry warnings, and blockchain records remain useful evidence sources, but they do not replace this business register.

The module provides:

- regulation, law, policy, standard, guideline, and licence-requirement records
- jurisdictions, regulators, effective dates, and review dates
- project and department obligations with responsible officers, due dates, frequency, and weight
- licence and permit records with issue, expiry, renewal lead time, conditions, and owner
- inspection scheduling, outcome, notes, and compliance scores
- evidence metadata linked to exactly one compliance record
- non-conformities with severity, due dates, root cause, and ownership
- corrective-action plans with progress and independent verification
- escalation to Department Head, executive, or regulator level
- workflow history and API audit events
- an authenticated CSV regulatory-register export

## Compliance score

The dashboard calculates a weighted obligation score:

- compliant: 100
- in progress: 50
- not started, non-compliant, or overdue: 0
- waived obligations: excluded

An incomplete obligation is treated as overdue when its due date passes, even before a scheduled background job persists that state. Permit status is similarly derived as expiring or expired from its expiry date and renewal lead period.

## Roles

- **Administrator / Compliance Officer:** control the regulation register, permits, inspections, verification, closure, and escalation.
- **Department Head / Project Manager:** create obligations assigned to themselves, raise findings, create corrective actions, update assigned records, and attach evidence.
- **Other authenticated roles:** read dashboards, registers, workflow history, and regulatory exports.

Only a compliance reviewer can mark obligations compliant, verify corrective actions, close non-conformities, or escalate findings.

## Evidence safety

Evidence records store an HTTPS repository URL, name, MIME type, notes, uploader, timestamp, and a single parent record. Binary documents are not stored in local storage or an unaudited application directory. The database migration enforces the single-parent invariant.
