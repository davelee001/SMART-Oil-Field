# Subscriptions Move Package

Aptos Move module to manage subscription plans with APT payment integration and pricing tiers.

## Structure
- Module: `subscriptions::subscription`
- Resources:
  - `Admin` — capability stored under the admin account with event handles
  - `Plans` — plan ids, durations (seconds), and prices (octas), stored under admin
  - `UserSubscription` — stored under subscriber containing `plan_admin`, `plan_id`, and `expires_at`
- Error Codes:
  - `E_ALREADY_INITIALIZED` (1) — admin already initialized
  - `E_NOT_ADMIN` (2) — caller is not an admin
  - `E_PLAN_EXISTS` (3) — plan ID already exists
  - `E_ALREADY_SUBSCRIBED` (4) — user already has a subscription
  - `E_PLAN_NOT_FOUND` (5) — plan ID not found
  - `E_NOT_SUBSCRIBED` (6) — user has no subscription to cancel
  - `E_SUBSCRIPTION_NOT_FOUND` (7) — subscription not found for renewal
  - `E_PLAN_MISMATCH` (8) — plan data inconsistency
  - `E_INSUFFICIENT_BALANCE` (9) — user lacks sufficient APT balance
  - `E_COIN_NOT_REGISTERED` (10) — user account not registered for AptosCoin

## Functions
- `init(admin: &signer)` — initializes admin + empty plans under the caller
- `create_plan(admin: &signer, plan_id: u64, duration_secs: u64, price_octas: u64)` — registers a plan with pricing (1 APT = 100,000,000 octas)
- `subscribe(user: &signer, plan_admin: address, plan_id: u64)` — subscribes using on-chain time, validates balance, and transfers payment to admin
- `cancel(user: &signer)` — cancels the caller's subscription (no refund)
- `get_subscription(addr: address)` — returns `(exists, plan_admin, plan_id, expires_at)`
- `is_active(addr: address, now_secs: u64)` — returns whether subscription is active
- `time_remaining(addr: address, now_secs: u64)` — seconds until expiry (0 if none/expired)
- `get_plan_duration(plan_admin: address, plan_id: u64)` — returns `(found, duration_secs)`
- `get_plan_price(plan_admin: address, plan_id: u64)` — returns `(found, price_octas)`
- `renew(user: &signer, now_secs: u64)` — extends expiry, validates balance, and transfers payment

## Unit Test
A simple end-to-end unit test is included in the module (`#[test]`), covering `init`, `create_plan`, `subscribe`, `get_subscription`, and `cancel`, and asserting event counters for `PlanCreated`, `Subscribed`, and `Canceled`.

## Events
- `PlanCreated { plan_id, duration_secs, price_octas }` — emitted under the admin on `create_plan`.
- `Subscribed { user, plan_admin, plan_id, expires_at }` — emitted under the plan admin on `subscribe` and `renew`.
- `Canceled { user }` — emitted under the plan admin on `cancel`.
- `PaymentReceived { from, plan_id, amount_octas }` — emitted under the plan admin when payment is received.
- `PaymentFailed { from, plan_id, required_octas, reason }` — emitted when payment validation fails (e.g., insufficient balance).
- `DiscountApplied { user, plan_id, original_price, discounted_price, month }` — emitted when seasonal discount is applied.

You can query events via the Aptos CLI or SDKs by using the admin account's event handles. For quick inspection with CLI:

```powershell
aptos account events --profile <admin_profile> --query all --limit 10
```

## Prerequisites
- Windows PowerShell
- Aptos CLI installed and on PATH
  - Install guide: https://aptos.dev/en/build/cli/

## Build & Test
```powershell
Push-Location "D:\_SCHOOL\MASTERS\Sem1\ICT APPLICATION IN OIL AND GAS\Project\blockchain\move\subscriptions"
aptos move test --named-addresses subscriptions=0xA11CE5
aptos move compile --named-addresses subscriptions=0xA11CE5 --network testnet
Pop-Location
```

## Publish (Testnet)
```powershell
Push-Location "D:\_SCHOOL\MASTERS\Sem1\ICT APPLICATION IN OIL AND GAS\Project\blockchain\move\subscriptions"
# Configure your Aptos profile first if needed
#   aptos init --profile default --network testnet
.\scripts\publish.ps1 -profile default -network testnet -addr 0xA11CE5
Pop-Location
```

## Notes
- **Payment Integration**: This module includes APT coin transfers from subscriber to plan admin on `subscribe` and `renew`.
- **Seasonal Discounts**: New subscribers registering in **March, August, or October** automatically receive a **30% discount** on their first subscription payment. The discount is only applied on initial subscribe, not on renewals.
- **Payment Validation**: Before transferring funds, the contract validates:
  - User account is registered for AptosCoin
  - User has sufficient balance to cover the plan price (after discount, if applicable)
  - If validation fails, a `PaymentFailed` event is emitted and the transaction aborts
- **Pricing**: Prices are stored in octas (1 APT = 100,000,000 octas). Free plans can be created with `price_octas = 0`.
- **No Refunds**: Canceling a subscription does not refund payments. Implement a separate refund mechanism if needed.
- **Events**: Events are included for off-chain indexing; production apps should index these for analytics and user notifications.
- **Error Handling**: Named error constants provide clear feedback for debugging failed transactions.

## Example Usage
```move
// Create pricing tiers
create_plan(admin, 1, 2592000, 100000000);  // Premium: 30 days, 1 APT
create_plan(admin, 2, 604800, 10000000);    // Basic: 7 days, 0.1 APT
create_plan(admin, 3, 259200, 0);           // Trial: 3 days, Free

// User subscribes to basic plan
// If subscribing in March, August, or October: pays 0.07 APT (30% off)
// Otherwise: pays full 0.1 APT
subscribe(user, admin_address, 2);

// User renews (no discount on renewal, pays full price)
renew(user, timestamp::now_seconds());
```

## Seasonal Discount Details
- **Discount Months**: March (3), August (8), October (10)
- **Discount Amount**: 30% off the plan price
- **Applied To**: New subscriptions only (not renewals)
- **Event**: `DiscountApplied` event logs all discount applications
- **Example**: 1 APT plan → 0.7 APT during discount months
