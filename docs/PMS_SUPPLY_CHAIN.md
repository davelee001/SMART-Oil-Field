# PMS Supply Chain and Supplier Performance

Phase 6 adds the commercial and performance-management records that are distinct from physical oil-batch tracking. PostgreSQL is the system of record for suppliers, qualifications, contracts, procurement requests, deliveries, evidence, reviews, and workflow history.

## Scope

- Supplier identity, contact, registration, tax, country, sector, category, HSE certification, and local-content information
- Qualification submissions and decisions using technical, financial, HSE, and local-content scores
- Supplier contracts linked optionally to PMS projects, with value, dates, responsible officer, and renewal lead time
- Purchase requests with submission and approval workflow
- Scheduled and actual deliveries, acceptance decisions, quality checks, and HSE checks
- Performance reviews using equally weighted quality, delivery, HSE, local-content, and cost scores
- Secure HTTPS evidence references and an auditable workflow event history
- Supplier register export and dashboard warnings for qualification, contract, request, and delivery risk

## Access control

All authenticated PMS roles have reporting access. Administrators and Supply Chain Officers manage suppliers, qualifications, contracts, approvals, and reviews. Project Managers and Department Heads can create purchase requests, record deliveries, and attach evidence.

The API rejects self-approval of a purchase request. It also rejects qualification decisions made by the user who registered the supplier. PostgreSQL check constraints provide a second line of defense for procurement self-approval, scores, percentages, monetary values, date ranges, and evidence ownership.

## Controlled workflow states

- Qualification: `NOT_STARTED` → `UNDER_REVIEW` → `APPROVED` or `REJECTED`; an approved record becomes effectively `EXPIRED` after its expiry date.
- Purchase request: `DRAFT` → `SUBMITTED` → `APPROVED` or `REJECTED`, followed by ordering and delivery states.
- Delivery: `SCHEDULED` → `IN_TRANSIT` → `DELIVERED` → `ACCEPTED` or `REJECTED`; overdue open deliveries are reported as late.
- Contract: active contracts are reported as expiring during their configured renewal lead period and expired after their end date.
- Performance: suppliers scoring below 70 percent are surfaced as below standard on the supply-chain dashboard.

## Routes

- Frontend workspace: `/supply-chain`
- Overview: `GET /api/supply-chain/overview`
- Full register: `GET /api/supply-chain/register`
- Form options: `GET /api/supply-chain/options`
- Suppliers and qualification: `/api/supply-chain/suppliers` and `/api/supply-chain/qualifications`
- Contracts: `/api/supply-chain/contracts`
- Purchase requests: `/api/supply-chain/purchase-requests`
- Deliveries: `/api/supply-chain/deliveries`
- Reviews: `/api/supply-chain/performance-reviews`
- Evidence: `POST /api/supply-chain/evidence`
- CSV register: `GET /api/supply-chain/reports/suppliers.csv`

## Database migration

Configure `DATABASE_URL`, generate the Prisma client, and deploy all pending migrations:

```bash
npm run db:generate
npm run db:migrate:deploy
```

The Phase 6 migration is `20260810075831_supplier_performance`.

## Existing operational services

The Python oil tracker and Aptos oil-tracker module continue to own physical batch stages, GPS locations, quality events, and ownership provenance. Phase 6 does not alter their schemas or APIs. Supplier contracts and purchase requests can be linked to PMS projects; a future approved integration may reference an oil-batch identifier without copying blockchain history into PostgreSQL.
