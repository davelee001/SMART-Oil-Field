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
- `create_plan(admin: &signer, plan_id: u64, duration_secs: u64, price_octas: u64, trial_secs: u64)` — registers a plan with pricing and optional free trial (1 APT = 100,000,000 octas)
- `subscribe(user: &signer, plan_admin: address, plan_id: u64)` — subscribes using on-chain time, validates balance, and transfers payment to admin
- `subscribe_with_code(user: &signer, plan_admin: address, plan_id: u64, discount_code: vector<u8>)` — subscribes with optional promotional discount code
- `subscribe_with_referral(user: &signer, plan_admin: address, plan_id: u64, discount_code: vector<u8>, referrer: address)` — subscribes with referral tracking (referrer earns 10% reward)
- `create_discount_code(admin: &signer, code: vector<u8>, discount_percent: u64, expiry_timestamp: u64, max_uses: u64)` — creates a promotional discount code (admin only)
- `get_referral_stats(user: address)` — returns `(has_stats, referrer, referral_count, total_rewards, active_referrals)`
- `cancel(user: &signer)` — cancels the caller's subscription (no refund, decrements referrer's active count)
- `cancel_with_refund(admin: &signer, user_addr: address)` — admin cancels a user's subscription and issues a pro-rated refund
- `get_subscription(addr: address)` — returns `(exists, plan_admin, plan_id, expires_at)`
- `is_active(addr: address, now_secs: u64)` — returns whether subscription is active
- `time_remaining(addr: address, now_secs: u64)` — seconds until expiry (0 if none/expired)
- `get_plan_duration(plan_admin: address, plan_id: u64)` — returns `(found, duration_secs)`
- `get_plan_price(plan_admin: address, plan_id: u64)` — returns `(found, price_octas)`
- `renew(user: &signer, now_secs: u64)` — extends expiry, validates balance, and transfers payment

### New & Advanced Features

- **Upgrade/Downgrade:**
  - `change_plan(user: &signer, new_plan_id: u64)` — upgrade or downgrade between plans (same admin), with pro-rated charge/refund.
- **Family/Group Subscriptions:**
  - `create_group_subscription(admin: &signer, plan_id: u64, max_members: u64)` — admin creates a group plan.
  - `join_group_subscription(user: &signer, group_admin: address)` — user joins a group plan.
  - `leave_group_subscription(user: &signer, group_admin: address)` — user leaves a group plan.
  - `remove_group_member(admin: &signer, member: address)` — admin removes a member from group.
  - `renew_group_subscription(admin: &signer)` — admin renews group plan for all members.
- **Auto-Renewal:**
  - `set_auto_renew(user: &signer, enable: bool)` — enable or disable auto-renewal for a subscription.
  - `get_auto_renew_status(user: address)` — view auto-renewal status.
- **Pause/Resume:**
  - `pause_subscription(user: &signer)` — pause a subscription (expiry is extended by pause duration).
  - `resume_subscription(user: &signer)` — resume a paused subscription.
  - `get_pause_status(user: address)` — view pause status and total paused time.
- **Free Trial Periods:**
  - Plans can have a free trial duration (set on creation). Users can only use a free trial for a plan once.
- **Gift Subscriptions:**
  - `gift_subscription(payer: &signer, recipient: address, plan_admin: address, plan_id: u64)` — purchase a subscription for another user.
- **Subscription Transfers:**
  - `transfer_subscription(sender: &signer, recipient: address)` — transfer a subscription to another user (removes from sender, gives to recipient).

## Unit Test
A simple end-to-end unit test is included in the module (`#[test]`), covering `init`, `create_plan`, `subscribe`, `get_subscription`, and `cancel`, and asserting event counters for `PlanCreated`, `Subscribed`, and `Canceled`.

## Events
- `PlanCreated { plan_id, duration_secs, price_octas }` — emitted under the admin on `create_plan`.
- `Subscribed { user, plan_admin, plan_id, expires_at }` — emitted under the plan admin on `subscribe` and `renew`.
- `Canceled { user }` — emitted under the plan admin on `cancel`.
- `PaymentReceived { from, plan_id, amount_octas }` — emitted under the plan admin when payment is received.
- `PaymentFailed { from, plan_id, required_octas, reason }` — emitted when payment validation fails (e.g., insufficient balance).
- `DiscountApplied { user, plan_id, original_price, discounted_price, month }` — emitted when seasonal discount is applied.
- `DiscountCodeUsed { user, code, discount_percent, savings }` — emitted when a promotional code is successfully used.
- `ReferralRewardPaid { referrer, referee, plan_id, reward_octas }` — emitted when referral reward is paid to referrer.
- `LoyaltyRewardApplied { user, plan_id, subscription_count, discount_percent, savings }` — emitted when loyalty discount is applied to returning subscribers.

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

## Promotional Discount Codes
- **Create Codes**: Admins can create promotional discount codes with custom percentages, expiry times, and usage limits
- **Usage**: Users can subscribe with `subscribe_with_code(user, admin, plan_id, b"PROMO2024")` to apply a discount
- **Validation**: Codes are validated for expiry and usage limits before application
- **Stacking**: If both seasonal discount and promo code are valid, the **higher discount** is applied
- **Example**:
  ```move
  // Admin creates a 50% off code, expires timestamp 1735689600, unlimited uses
  create_discount_code(admin, b"HALFPRICE", 50, 1735689600, 0);
  
  // User subscribes with code
  subscribe_with_code(user, admin_address, 1, b"HALFPRICE");
  ```

## Referral System
- **Referral Rewards**: When a user subscribes with a referrer address, the referrer earns **10% of the subscription price** as APT
- **Tracking**: The contract tracks who referred each user, total referrals, rewards earned, and active referral count
- **Usage**: `subscribe_with_referral(user, admin, plan_id, b"", referrer_address)`
- **Benefits for Referrers**:
  - Earn passive income from referred users
  - Track total rewards earned
  - Monitor active referral subscriptions
- **Cancellation Impact**: When a referred user cancels, the referrer's active referral count decrements
- **Example**:
  ```move
  // Alice refers Bob to subscribe
  subscribe_with_referral(bob, admin_address, 1, b"", alice_address);
  // Alice receives 0.1 APT (10% of 1 APT plan price)
  
  // Check Alice's referral stats
  let (exists, _, count, rewards, active) = get_referral_stats(alice_address);
  // count = 1, rewards = 10000000 octas (0.1 APT), active = 1
  ```

## Loyalty Rewards
- **Loyalty Discount**: Returning subscribers automatically receive a **15% discount** on all future subscriptions
- **Qualification**: Anyone who has subscribed at least once before qualifies for loyalty discount
- **Automatic Application**: No code needed - system detects returning subscribers via `UserDiscountHistory`
- **Subscription Tracking**: Contract maintains `subscription_count` for each user
- **Smart Stacking**: Loyalty discount competes with seasonal (30%), promo codes, and referral discounts - **highest wins**
- **Event Tracking**: `LoyaltyRewardApplied` event emitted with subscription count and savings
- **Example**:
  ```move
  // Bob's first subscription - pays full price (1 APT)
  subscribe(bob, admin_address, 1);
  // subscription_count = 1
  
  // Bob's second subscription - gets 15% loyalty discount
  subscribe(bob, admin_address, 1);
  // Pays 0.85 APT (15% off), subscription_count = 2
  
  // If seasonal discount (30%) is active, Bob gets 30% instead of 15%
  // Always receives the best available discount
  ```

## Grace Period System
- **Grace Period Duration**: 5 days after cancellation before permanent removal
- **Cancel Function**: Calling `cancel()` starts grace period instead of immediate deletion
- **Grace Period Tracking**: `in_grace_period` flag and `grace_ends_at` timestamp stored in `UserSubscription`
- **Renewal During Grace**: Users can call `renew()` during grace period to restore full access
- **Hard Cancel**: Users can call `hard_cancel()` for immediate permanent removal
- **Event Tracking**: `GracePeriodStarted` event emitted with expiry information
- **View Function**: `get_grace_period_status(address)` returns grace period status
- **Example**:
  ```move
  // User cancels subscription - enters grace period
  cancel(user);
  // in_grace_period = true, grace_ends_at = current_time + 5 days
  
  // Check grace period status
  let (in_grace, ends_at) = get_grace_period_status(user_address);
  // in_grace = true, ends_at = timestamp 5 days from now
  
  // Option 1: User changes mind and renews during grace period
  renew(user, timestamp::now_seconds());
  // Full access restored, grace period cleared
  
  // Option 2: User wants immediate removal
  hard_cancel(user);
  // Subscription permanently removed, no grace period
  ```

## Partial Refunds
- **Pro-Rated Refunds**: Users can get refunds based on unused subscription time
- **Admin-Approved**: Plan admin must approve and execute the refund
- **Automatic Calculation**: Refund = (Unused Days / Total Days) × Payment Amount
- **Payment Tracking**: Contract stores `last_payment_amount` and `subscription_start` for accurate calculations
- **Event Tracking**: `RefundIssued` event emitted with refund amount and days unused
- **Example**:
  ```move
  // User has 30-day subscription, paid 1 APT, cancels after 15 days
  // 15 days unused of 30 total = 50% refund
  cancel_with_refund(admin, user_address);
  // User receives 0.5 APT refund (15/30 * 1 APT)
  // RefundIssued event: { user, plan_id, refund_amount: 50000000, days_unused: 15 }
  
  // User subscribed for 7 days, paid 0.1 APT, cancels after 2 days
  // 5 days unused of 7 total = 71.4% refund
  cancel_with_refund(admin, user_address);
  // User receives ~0.071 APT refund (5/7 * 0.1 APT)
  ```
- **Event**: `DiscountApplied` event logs all discount applications
- **Example**: 1 APT plan → 0.7 APT during discount months
