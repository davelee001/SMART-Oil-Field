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
