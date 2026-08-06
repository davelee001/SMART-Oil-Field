# PMS authentication architecture

The Phase 1 PMS runtime uses one React application, one Express API, and PostgreSQL through Prisma:

```text
apps/api                  Express REST API, JWT authentication, and RBAC
packages/database         Prisma schema, migrations, seed, and database client
packages/shared           Shared PMS roles and authenticated-user contracts
src/frontend              Existing React application and administrator UI
docker-compose.yml        PostgreSQL and API runtime
```

The older FastAPI, TypeScript gateway, Redis, RabbitMQ, InfluxDB, analytics, machine-learning, and blockchain components remain available as specialist services. Their operational features are not removed by this foundation.

## Security model

- Passwords are hashed with bcrypt using cost factor 12.
- Access tokens are signed JWTs using HS256, a minimum 64-character secret, explicit issuer and audience, and a configurable expiry.
- Browsers receive the JWT through the `sof.access_token` HTTP-only, SameSite=Lax cookie. The frontend does not persist tokens in local storage.
- API clients can use the token returned by login in the Bearer authorization header.
- Protected Express endpoints validate the signature and then reload the user from PostgreSQL. Disabled accounts and token-version mismatches are rejected.
- Logout, role changes, and account-status changes increment `tokenVersion`, revoking earlier operational API tokens.
- The FastAPI specialist service verifies the same JWT signature and claims, then introspects the central `/api/auth/me` endpoint so account status, role changes, logout, and token-version revocation are enforced across services.

## Local setup

1. Copy `.env.example` to `.env`.
2. Generate a unique `JWT_SECRET` of at least 64 random characters.
3. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters.
4. Start PostgreSQL with `docker compose up -d postgres`.
5. Run `npm install`, `npm run db:generate`, and `npm run db:migrate`.
6. Run `npm run db:seed` once to create or promote the initial administrator.
7. Start the API with `npm run dev:api` and the web application with `npm run dev:web`.

For production, use `npm run db:migrate:deploy`, enable `JWT_COOKIE_SECURE=true`, serve both applications over HTTPS, restrict `FRONTEND_ORIGIN`, and inject secrets through the deployment platform rather than source control.

## Role enforcement

Public registration, when enabled, creates Viewer accounts. Set `ALLOW_PUBLIC_REGISTRATION=false` to make account creation administrator-only. Only Administrators can create users, change roles, or change account status through `/api/admin/users` and `/admin/users`.
