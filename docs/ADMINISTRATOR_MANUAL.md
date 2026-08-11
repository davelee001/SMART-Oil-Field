# PMS administrator manual

## Administrator responsibilities

Administrators control identity, roles, account status, system templates, releases, recovery coordination, and audit support. Administrator access does not remove separation-of-duties rules: an author cannot independently approve or sign the same controlled record.

## Identity administration

- Create named accounts only; shared accounts are prohibited.
- Assign the least-privileged PMS role and correct department.
- Disable departed, transferred, dormant, or compromised accounts promptly.
- Review active administrators and Department Heads regularly.
- Treat role and status changes as auditable operational changes.
- Keep public registration disabled in production.

The supported roles are Administrator, Project Manager, Monitoring and Evaluation Officer, Compliance Officer, Finance Officer, Supply Chain Officer, Department Head, and Viewer.

## Initial administrator

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD`, then run `npm run db:seed`. The command creates or promotes the configured account and installs controlled report templates idempotently. Sign in, create a separately named administrator account if required by policy, rotate the seed password, and remove seed credentials from the interactive shell and deployment logs.

## Controlled reporting

Administrators may draft templates, but a different authorized person must activate them. Validate allowed author roles, sections, scope, and report type before activation. Archive published reports through the application workflow; never modify immutable versions directly in PostgreSQL.

## Daily and periodic checks

- Daily: service health, failed logins, disabled-account access attempts, backup completion and storage capacity.
- Weekly: overdue workflow items, expiring permits/certificates, failed KPI connectors and unresolved report rejections.
- Monthly: privileged accounts, role assignments, dormant accounts, audit events and restore sample integrity.
- Quarterly: isolated restore drill, access recertification, incident exercise and production acceptance review.

## Release and recovery

Follow `docs/DEPLOYMENT_RUNBOOK.md`. Never restore over production without an approved recovery point, verified SHA-256 checksum, stopped writers, explicit `-ConfirmRestore`, and a documented acceptance test after restart.

