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
- `subscribe(user: &signer, plan_admin: address, plan_id: u64, now_secs: u64)` — subscribes caller to a plan
- `cancel(user: &signer)` — cancels the caller's subscription
- `get_subscription(addr: address)` — returns `(exists, plan_admin, plan_id, expires_at)`

## Unit Test
A simple end-to-end unit test is included in the module (`#[test]`), covering `init`, `create_plan`, `subscribe`, `get_subscription`, and `cancel`.

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
