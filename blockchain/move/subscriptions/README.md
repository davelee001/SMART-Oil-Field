# Subscriptions Move Package

Minimal Aptos Move module to manage subscription plans and user subscriptions.

## Structure
- Module: `subscriptions::subscription`
- Resources:
  - `Admin` — capability stored under the admin account
  - `Plans` — plan ids and durations (in seconds), stored under admin
  - `UserSubscription` — stored under subscriber containing `plan_admin`, `plan_id`, and `expires_at`

## Functions
- `init(admin: &signer)` — initializes admin + empty plans under the caller
- `create_plan(admin: &signer, plan_id: u64, duration_secs: u64)` — registers a plan
- `subscribe(user: &signer, plan_admin: address, plan_id: u64)` — subscribes using on-chain time
- `cancel(user: &signer)` — cancels the caller's subscription
- `get_subscription(addr: address)` — returns `(exists, plan_admin, plan_id, expires_at)`
- `is_active(addr: address, now_secs: u64)` — returns whether subscription is active
- `time_remaining(addr: address, now_secs: u64)` — seconds until expiry (0 if none/expired)
- `get_plan_duration(plan_admin: address, plan_id: u64)` — returns `(found, duration_secs)`
- `renew(user: &signer, now_secs: u64)` — extends expiry from `max(current_expires, now_secs)` by plan duration

## Unit Test
A simple end-to-end unit test is included in the module (`#[test]`), covering `init`, `create_plan`, `subscribe`, `get_subscription`, and `cancel`, and asserting event counters for `PlanCreated`, `Subscribed`, and `Canceled`.

## Events
- `PlanCreated { plan_id, duration_secs }` — emitted under the admin on `create_plan`.
- `Subscribed { user, plan_admin, plan_id, expires_at }` — emitted under the plan admin on `subscribe`.
- `Canceled { user }` — emitted under the plan admin on `cancel`.

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
- This package avoids coin transfers; it only manages plan metadata and user subscription state.
- For payments, integrate an escrow or coin transfer flow in a separate module and call it from `subscribe`.
- Events are included for off-chain indexing; production apps should index these for analytics and user notifications.
