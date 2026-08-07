# PMS budgeting and finance

## Scope

Phase 4 introduces project budgeting as a PostgreSQL domain. It does not reuse subscription invoices, token payments, discounts, referrals, or blockchain transactions as project expenditure. Those existing capabilities remain unchanged and can only be integrated later through an explicitly approved reconciliation design.

The module records:

- one annual budget per project and fiscal year
- proposed and approved annual allocations
- budget categories and their proposed/approved ceilings
- funding sources
- financial reporting periods and open/closed status
- commitments and actual expenditures
- expenditure realization against approved commitments
- supporting-document metadata and secure repository URLs
- budget and finance-entry submission/review history
- audit events for every material workflow action

## Calculated controls

Each budget response contains a `summary` with:

- `proposedBudget`
- `approvedAllocation`
- `actualExpenditure` from approved expenditure entries
- `commitments` as approved commitments less approved linked expenditure
- `remainingBalance` as approved allocation less actual expenditure and outstanding commitments
- `variance` as approved allocation less actual expenditure
- `percentageUtilized` as approved expenditure divided by approved allocation

Approving a commitment or direct expenditure is blocked when it would exceed the relevant category allocation. An expenditure linked to a commitment cannot exceed that commitment's remaining amount.

## Roles and workflow

All authenticated users can read finance records for PMS reporting.

- **Administrator / Finance Officer:** manage budgets, periods, entries, documents, and review submitted records.
- **Project Manager:** prepare, submit, and record finance activity for projects they manage.
- **Department Head:** prepare and submit project budgets and finance activity.
- **Other roles:** read-only reporting access.

A creator cannot approve their own budget or finance entry. Draft and rejected budgets can be corrected; category, funding, and period setup locks on submission. A budget needs at least one category and reporting period, and category totals must equal the proposed annual amount before submission. Funding-source totals must also match when funding sources are supplied.

Budgets move through `DRAFT → SUBMITTED → APPROVED` or `REJECTED`. Commitments and expenditures independently move through `DRAFT → SUBMITTED → APPROVED` or `REJECTED`. Only approved budgets accept finance entries. Closed periods reject new entries.

## API

The protected API is mounted at `/api/finance`:

- `GET/POST /budgets`
- `GET/PATCH /budgets/:budgetId`
- `POST /budgets/:budgetId/submit`
- `POST /budgets/:budgetId/decision`
- category, funding-source, and period creation/removal routes
- period status route for financial close
- finance-entry creation, correction, submission, and decision routes
- supporting-document reference route

The frontend workspace is `/finance`.

## Database migration

Generate the client and apply migrations in development:

```bash
npm run db:generate
npm run db:migrate
```

For controlled environments:

```bash
npm run db:migrate:deploy
```

The Phase 4 migration is `packages/database/prisma/migrations/20260806150000_budget_finance/migration.sql`.

## Supporting documents

Phase 4 stores document names, MIME types, relationships, upload actors, timestamps, and HTTPS URLs. Binary files must reside in an approved secure document repository. This avoids storing confidential financial files in browser local storage or introducing an unaudited filesystem upload service.
