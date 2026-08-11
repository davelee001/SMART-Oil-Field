# Production deployment runbook

## Release contract

The PMS production release consists of PostgreSQL 16, the Express/Prisma API, and the Nginx-served React frontend. Telemetry, oil movement, analytics, machine-learning, blockchain, and subscription services remain independent integrations and are not removed by this deployment.

Production requires Docker Engine with Compose v2, an HTTPS reverse proxy or load balancer, managed DNS, durable storage, and an off-host encrypted backup destination. Never use values from `.env.example` in production.

## Required environment

| Variable | Requirement |
| --- | --- |
| `DATABASE_URL` | URL-encoded PostgreSQL connection string for the Compose database |
| `POSTGRES_PASSWORD` | Unique database password stored in the deployment secret manager |
| `JWT_SECRET` | Random secret of at least 64 characters |
| `FRONTEND_ORIGIN` | Exact public HTTPS origin, without a trailing slash |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Initial administrator seed credentials; rotate the password after validation |
| `JWT_COOKIE_SECURE` | Forced to `true` by production Compose |
| `ALLOW_PUBLIC_REGISTRATION` | Forced to `false` by production Compose |

Optional controls include `JWT_TTL_MINUTES`, `AUTH_RATE_LIMIT_MAX`, `AUTH_RATE_LIMIT_WINDOW_MS`, `SHUTDOWN_TIMEOUT_MS`, `HTTP_PORT`, and `OPERATIONAL_API_URL`.

## Pre-deployment gate

```powershell
npm ci
npm run release:check:containers
docker compose -f docker-compose.production.yml config
```

Resolve every failed test, type error, build error, high or critical dependency advisory, or container-build failure. Review moderate findings against actual usage and record any accepted risk with an owner and review date. Record the commit SHA, approver, database backup identifier, and maintenance window in the release ticket.

## Deployment

1. Take and copy an off-host PostgreSQL backup.
2. Pull the approved commit and provide secrets through the host environment or protected `.env` file.
3. Run `docker compose -f docker-compose.production.yml build --pull`.
4. Run `docker compose -f docker-compose.production.yml up -d`.
5. Confirm `migrate` exits successfully and `postgres`, `api`, and `web` are healthy.
6. Run `./scripts/smoke-test.ps1 -BaseUrl https://pms.example.com` with administrator credentials supplied through environment variables.
7. Validate one authorized workflow in each installed PMS module and confirm specialist integrations remain reachable.

The migration service applies migrations and seeds controlled templates before the API is allowed to start. The seed is idempotent. The API container itself does not mutate schema at startup.

## Rollback

Application rollback and data rollback are separate decisions. Prefer rolling the application image back while retaining forward-compatible schema. Do not reverse a migration or restore a database until the release owner and database owner confirm that post-deployment records may be discarded.

```powershell
docker compose -f docker-compose.production.yml down
./scripts/restore-postgres.ps1 -BackupPath <approved.dump> -ListOnly
./scripts/restore-postgres.ps1 -BackupPath <approved.dump> -ConfirmRestore
docker compose -f docker-compose.production.yml up -d
```

Record the incident timeline, restored checksum, recovery point, recovery duration, and post-restore smoke-test evidence.

## Monitoring and incident response

- Probe `/health/live` for process health and `/health/ready` for database readiness.
- Correlate API failures with the `X-Request-Id` response header.
- Alert on readiness failures, restart loops, HTTP 5xx rates, authentication throttling, database capacity, backup failures, and certificate expiry.
- On suspected credential exposure, rotate the JWT secret and affected passwords; this invalidates existing JWTs.
- Keep PostgreSQL private and expose only the HTTPS frontend endpoint.

## Backup schedule

Run `scripts/backup-postgres.ps1` daily and before every release. Copy the dump, checksum, and manifest to encrypted off-host storage. Retain daily, weekly, monthly, and annual recovery points according to organizational policy. Perform a restore drill at least quarterly in an isolated database.
