# Simplified PMS architecture

The default PMS runtime now uses one web application, one API, and one PostgreSQL database:

```text
apps/api                  Express REST API and session authentication
packages/database         Prisma schema, migrations, seed, and database client
packages/shared           Shared PMS roles and session-user contracts
src/frontend              Existing React web application
docker-compose.yml        PostgreSQL and API runtime
```

The older Python, Redis, RabbitMQ, and blockchain services remain available for future specialist workloads, but they are not required to run authentication or the initial PMS.

## Local setup

1. Copy `.env.example` to `.env` and replace `SESSION_SECRET` and the administrator password.
2. Start PostgreSQL with `docker compose up postgres -d`.
3. Run `npm install` and `npm run db:generate`.
4. Run `npm run db:migrate` and `npm run db:seed`.
5. Start the API with `npm run dev:api` and the web application with `npm run dev:web`.

The web application runs on port 3000 and proxies `/api` to the API on port 4000. Sessions are stored in PostgreSQL and delivered through an HTTP-only, SameSite cookie.

## PMS roles

- Administrator
- Project Manager
- Compliance Officer
- M&E Officer
- Finance Officer
- Department Head
- Viewer

Public registration creates Viewer accounts. Only Administrators can create users, change roles, or disable accounts through `/admin/users`.
