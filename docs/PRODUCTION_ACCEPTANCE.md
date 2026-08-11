# Production acceptance record

Use this document for each release candidate. Repository automation provides evidence, but the release owner must complete live-environment checks before production acceptance.

## Release identity

- Commit SHA:
- Image digests:
- Environment:
- Release owner:
- Technical approver:
- Business approver:
- Deployment window:
- Pre-release backup and SHA-256:

## Automated evidence

- [ ] Clean dependency installation completed
- [ ] High/critical dependency audit passed and moderate findings were reviewed
- [ ] PostgreSQL migrations applied to an isolated test database
- [ ] Seed command completed idempotently
- [ ] Full API unit and integration suite passed
- [ ] Shared, database, API and frontend TypeScript checks passed
- [ ] Production frontend build passed
- [ ] API and frontend container builds passed

## Live technical acceptance

- [ ] HTTPS certificate, DNS and security headers validated
- [ ] PostgreSQL is not publicly exposed
- [ ] Liveness and readiness probes are healthy
- [ ] Administrator login and persistent cookie session passed
- [ ] Public registration is disabled
- [ ] Viewer and domain-role access restrictions verified
- [ ] Authentication throttling verified without locking out legitimate operations
- [ ] Request ID is present on API responses and searchable in logs
- [ ] Telemetry, oil movement, analytics, ML and blockchain integrations remain operational
- [ ] Backup completed, copied off-host and checksum verified
- [ ] Isolated restore drill completed within recovery objectives

## Business acceptance

- [ ] Project, finance, compliance, supplier, KPI and training workflows sampled
- [ ] Formal report generated, independently approved, signed, published and exported
- [ ] Report checksum and immutable revision history verified
- [ ] User and administrator manuals issued
- [ ] Known limitations, owners and target dates recorded

## Decision

- [ ] Accepted
- [ ] Accepted with documented conditions
- [ ] Rejected

Decision notes and signatures:
