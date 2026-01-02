# Subscriptions Move Package

Aptos Move module to manage subscription plans with APT payment integration and pricing tiers.

## Structure
- Module: `subscriptions::subscription`
- Resources:
  - `Admin` — capability stored under the admin account with event handles
  - `Plans` — plan ids, durations (seconds), and prices (octas), stored under admin
  - `UserSubscription` — stored under subscriber containing `plan_admin`, `plan_id`, and `expires_at`

## Functions
- `init(admin: &signer)` — initializes admin + empty plans under the caller
- `create_plan(admin: &signer, plan_id: u64, duration_secs: u64, price_octas: u64)` — registers a plan with pricing (1 APT = 100,000,000 octas)
- `subscribe(user: &signer, plan_admin: address, plan_id: u64)` — subscribes using on-chain time and transfers payment to admin
- `cancel(user: &signer)` — cancels the caller's subscription (no refund)
- `get_subscription(addr: address)` — returns `(exists, plan_admin, plan_id, expires_at)`
- `is_active(addr: address, now_secs: u64)` — returns whether subscription is active
- `time_remaining(addr: address, now_secs: u64)` — seconds until expiry (0 if none/expired)
- `get_plan_duration(plan_admin: address, plan_id: u64)` — returns `(found, duration_secs)`
- `get_plan_price(plan_admin: address, plan_id: u64)` — returns `(found, price_octas)`
- `renew(user: &signer, now_secs: u64)` — extends expiry from `max(current_expires, now_secs)` by plan duration and transfers payment

## Unit Test
A simple end-to-end unit test is included in the module (`#[test]`), covering `init`, `create_plan`, `subscribe`, `get_subscription`, and `cancel`, and asserting event counters for `PlanCreated`, `Subscribed`, and `Canceled`.

## Events
- `PlanCreated { plan_id, duration_secs, price_octas }` — emitted under the admin on `create_plan`.
- `Subscribed { user, plan_admin, plan_id, expires_at }` — emitted under the plan admin on `subscribe` and `renew`.
- `Canceled { user }` — emitted under the plan admin on `cancel`.
- `PaymentReceived { from, plan_id, amount_octas }` — emitted under the plan admin when payment is received.

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
- **Payment Integration**: This module now includes APT coin transfers from subscriber to plan admin on `subscribe` and `renew`.
- **Pricing**: Prices are stored in octas (1 APT = 100,000,000 octas). Free plans can be created with `price_octas = 0`.
- **No Refunds**: Canceling a subscription does not refund payments. Implement a separate refund mechanism if needed.
- **Events**: Events are included for off-chain indexing; production apps should index these for analytics and user notifications.

## Example Usage
```move
// Create pricing tiers
create_plan(admin, 1, 2592000, 100000000);  // Premium: 30 days, 1 APT
create_plan(admin, 2, 604800, 10000000);    // Basic: 7 days, 0.1 APT
create_plan(admin, 3, 259200, 0);           // Trial: 3 days, Free

// User subscribes to basic plan (auto-transfers 0.1 APT)
subscribe(user, admin_address, 2);

// User renews (auto-transfers another 0.1 APT)
renew(user, timestamp::now_seconds());
```
