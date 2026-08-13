# Production acceptance record

Use this document for each release candidate. Repository automation provides evidence, but the release owner must complete live-environment checks before production acceptance.

## Release identity

- Commit SHA: `fa33d385d14931642e7428af08d64bfa5b3e93e4`
- Image digests:
- Environment: Staging candidate; production target pending confirmation
- Release owner: Pending assignment
- Technical approver:
- Business approver:
- Deployment window: Pending scheduling
- Pre-release backup and SHA-256:

## Automated evidence

- [x] Clean dependency installation completed (GitHub Actions run 31691254107)
- [x] High/critical dependency audit passed; two moderate `uuid` findings through ExcelJS reviewed
- [x] PostgreSQL migrations applied to an isolated CI test database
- [x] Seed command completed idempotently
- [x] Full API unit and integration suite passed (103 tests)
- [x] Shared, database, API and frontend TypeScript checks passed
- [x] Production frontend build passed
- [x] API and frontend container builds passed

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
