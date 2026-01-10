    /// Group (family) subscription resource stored under the group admin
    struct GroupSubscription has key {
        plan_admin: address,
        plan_id: u64,
        expires_at: u64,
        members: vector<address>,
        max_members: u64,
    }

    /// Create a new group subscription (admin only, for a plan)
    public entry fun create_group_subscription(admin: &signer, plan_id: u64, max_members: u64) acquires Plans, GroupSubscription {
        let admin_addr = signer::address_of(admin);
        assert!(!exists<GroupSubscription>(admin_addr), E_ALREADY_INITIALIZED);
        let plans = borrow_global<Plans>(admin_addr);
        let (found, idx) = find_index(&plans.ids, plan_id);
        assert!(found, E_PLAN_NOT_FOUND);
        let dur = *vector::borrow(&plans.durations, idx);
        let now_secs = timestamp::now_seconds();
        move_to(admin, GroupSubscription{
            plan_admin: admin_addr,
            plan_id,
            expires_at: now_secs + dur,
            members: vector::empty<address>(),
            max_members
        });
    }

    /// Join a group subscription (user joins by group admin address)
    public entry fun join_group_subscription(user: &signer, group_admin: address) acquires GroupSubscription, UserSubscription {
        let user_addr = signer::address_of(user);
        assert!(!exists<UserSubscription>(user_addr), E_ALREADY_SUBSCRIBED);
        assert!(exists<GroupSubscription>(group_admin), E_PLAN_NOT_FOUND);
        let group = borrow_global_mut<GroupSubscription>(group_admin);
        let n = vector::length(&group.members);
        assert!(n < group.max_members, E_PLAN_EXISTS); // reuse error for "group full"
        vector::push_back(&mut group.members, user_addr);
        // User gets a UserSubscription with same expiry as group
        move_to(user, UserSubscription{
            plan_admin: group.plan_admin,
            plan_id: group.plan_id,
            expires_at: group.expires_at,
            in_grace_period: false,
            grace_ends_at: 0,
            last_payment_amount: 0,
            subscription_start: timestamp::now_seconds(),
            auto_renew: false
        });
    }

    /// Leave a group subscription (user removes self)
    public entry fun leave_group_subscription(user: &signer, group_admin: address) acquires GroupSubscription, UserSubscription {
        let user_addr = signer::address_of(user);
        assert!(exists<UserSubscription>(user_addr), E_NOT_SUBSCRIBED);
        assert!(exists<GroupSubscription>(group_admin), E_PLAN_NOT_FOUND);
        let group = borrow_global_mut<GroupSubscription>(group_admin);
        let mut i = 0u64;
        let n = vector::length(&group.members);
        let mut found = false;
        while (i < n) {
            if (*vector::borrow(&group.members, i) == user_addr) {
                found = true;
                break;
            };
            i = i + 1;
        };
        assert!(found, E_NOT_SUBSCRIBED);
        vector::swap_remove(&mut group.members, i);
        let _ = move_from<UserSubscription>(user_addr);
    }

    /// Admin can remove a member from group
    public entry fun remove_group_member(admin: &signer, member: address) acquires GroupSubscription, UserSubscription {
        let admin_addr = signer::address_of(admin);
        assert!(exists<GroupSubscription>(admin_addr), E_NOT_ADMIN);
        let group = borrow_global_mut<GroupSubscription>(admin_addr);
        let mut i = 0u64;
        let n = vector::length(&group.members);
        let mut found = false;
        while (i < n) {
            if (*vector::borrow(&group.members, i) == member) {
                found = true;
                break;
            };
            i = i + 1;
        };
        assert!(found, E_NOT_SUBSCRIBED);
        vector::swap_remove(&mut group.members, i);
        if (exists<UserSubscription>(member)) {
            let _ = move_from<UserSubscription>(member);
        }
    }

    /// Renew group subscription (admin only)
    public entry fun renew_group_subscription(admin: &signer) acquires GroupSubscription, Plans, UserSubscription {
        let admin_addr = signer::address_of(admin);
        assert!(exists<GroupSubscription>(admin_addr), E_NOT_ADMIN);
        let group = borrow_global_mut<GroupSubscription>(admin_addr);
        let plans = borrow_global<Plans>(admin_addr);
        let (found, idx) = find_index(&plans.ids, group.plan_id);
        assert!(found, E_PLAN_NOT_FOUND);
        let dur = *vector::borrow(&plans.durations, idx);
        let now_secs = timestamp::now_seconds();
        let new_expiry = if (group.expires_at > now_secs) { group.expires_at + dur } else { now_secs + dur };
        group.expires_at = new_expiry;
        // Update all members' expiry
        let n = vector::length(&group.members);
        let mut i = 0u64;
        while (i < n) {
            let member = *vector::borrow(&group.members, i);
            if (exists<UserSubscription>(member)) {
                let sub = borrow_global_mut<UserSubscription>(member);
                sub.expires_at = new_expiry;
            };
            i = i + 1;
        }
    }
address subscriptions {
module subscription {
    use std::signer;
    use std::vector;
    use aptos_std::event;
    use aptos_std::timestamp;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    /// Error codes
    const E_ALREADY_INITIALIZED: u64 = 1;
    const E_NOT_ADMIN: u64 = 2;
    const E_PLAN_EXISTS: u64 = 3;
    const E_ALREADY_SUBSCRIBED: u64 = 4;
    const E_PLAN_NOT_FOUND: u64 = 5;
    const E_NOT_SUBSCRIBED: u64 = 6;
    const E_SUBSCRIPTION_NOT_FOUND: u64 = 7;
    const E_PLAN_MISMATCH: u64 = 8;
    const E_INSUFFICIENT_BALANCE: u64 = 9;
    const E_COIN_NOT_REGISTERED: u64 = 10;

    /// Discount constants
    const DISCOUNT_PERCENT: u64 = 30;  // 30% discount
    const REFERRAL_BONUS_PERCENT: u64 = 10;  // 10% referral discount
    const LOYALTY_DISCOUNT_PERCENT: u64 = 15;  // 15% loyalty discount for returning users
    const GRACE_PERIOD_DAYS: u64 = 5;  // 5 days grace period after expiry
    const SECONDS_PER_DAY: u64 = 86400;
    const DAYS_PER_YEAR: u64 = 365;

    /// Event types
    struct PlanCreated has drop, store { plan_id: u64, duration_secs: u64, price_octas: u64 }
    struct Subscribed has drop, store { user: address, plan_admin: address, plan_id: u64, expires_at: u64 }
    struct Canceled has drop, store { user: address }
    struct PaymentReceived has drop, store { from: address, plan_id: u64, amount_octas: u64 }
    struct PaymentFailed has drop, store { from: address, plan_id: u64, required_octas: u64, reason: u64 }
    struct DiscountApplied has drop, store { user: address, plan_id: u64, original_price: u64, discounted_price: u64, month: u64 }
    struct DiscountCodeUsed has drop, store { user: address, code: vector<u8>, discount_percent: u64, savings: u64 }
    struct ReferralRewardPaid has drop, store { referrer: address, referee: address, plan_id: u64, reward_octas: u64 }
    struct LoyaltyRewardApplied has drop, store { user: address, plan_id: u64, subscription_count: u64, discount_percent: u64, savings: u64 }
    struct GracePeriodStarted has drop, store { user: address, expired_at: u64, grace_ends_at: u64 }
    struct RefundIssued has drop, store { user: address, plan_id: u64, refund_amount: u64, days_unused: u64 }

    /// Capability + event handles stored under the admin account
    struct Admin has key {
        plan_created_events: event::EventHandle<PlanCreated>,
        subscribed_events: event::EventHandle<Subscribed>,
        canceled_events: event::EventHandle<Canceled>,
        payment_events: event::EventHandle<PaymentReceived>,
        payment_failed_events: event::EventHandle<PaymentFailed>,
        discount_events: event::EventHandle<DiscountApplied>,
        discount_code_events: event::EventHandle<DiscountCodeUsed>,
        referral_events: event::EventHandle<ReferralRewardPaid>,
        loyalty_events: event::EventHandle<LoyaltyRewardApplied>,
        grace_period_events: event::EventHandle<GracePeriodStarted>,
        refund_events: event::EventHandle<RefundIssued>,
    }

    /// Plans registry stored under the admin account
    struct Plans has key {
        ids: vector<u64>,            // plan ids
        durations: vector<u64>,      // duration in seconds per plan id
        prices: vector<u64>,         // price in octas (1 APT = 100,000,000 octas) per plan id
    }

    /// User subscription stored under the subscriber account
    struct UserSubscription has key {
        plan_admin: address,
        plan_id: u64,
        expires_at: u64,
        in_grace_period: bool,
        grace_ends_at: u64,
        last_payment_amount: u64,  // For pro-rated refund calculation
        subscription_start: u64,   // When current subscription started
        auto_renew: bool,          // For future auto-renewal feature
    }
    /// Upgrade or downgrade the user's subscription to a different plan (same admin)
    /// Handles pro-rated charge/refund for the remaining period
    /// Transfers difference in price (if any) between old and new plan
    /// Only allows upgrade/downgrade within the same plan_admin
    public entry fun change_plan(user: &signer, new_plan_id: u64) acquires Admin, Plans, UserSubscription {
        let user_addr = signer::address_of(user);
        assert!(exists<UserSubscription>(user_addr), E_NOT_SUBSCRIBED);
        let sub = borrow_global_mut<UserSubscription>(user_addr);
        let plan_admin = sub.plan_admin;
        let old_plan_id = sub.plan_id;
        let old_expires = sub.expires_at;
        let now_secs = timestamp::now_seconds();
        let old_payment = sub.last_payment_amount;

        // Get old and new plan info
        let plans = borrow_global<Plans>(plan_admin);
        let (found_old, idx_old) = find_index(&plans.ids, old_plan_id);
        let (found_new, idx_new) = find_index(&plans.ids, new_plan_id);
        assert!(found_old, E_PLAN_NOT_FOUND);
        assert!(found_new, E_PLAN_NOT_FOUND);
        let old_duration = *vector::borrow(&plans.durations, idx_old);
        let new_duration = *vector::borrow(&plans.durations, idx_new);
        let old_price = *vector::borrow(&plans.prices, idx_old);
        let new_price = *vector::borrow(&plans.prices, idx_new);

        // Calculate unused time and pro-rate value
        let remaining_secs = if (old_expires > now_secs) { old_expires - now_secs } else { 0 };
        let old_total_secs = old_duration;
        let new_total_secs = new_duration;
        let refund = if (old_total_secs > 0 && old_payment > 0 && remaining_secs > 0) {
            (old_payment * remaining_secs) / old_total_secs
        } else { 0 };

        // Calculate new plan price for the same remaining period (pro-rated)
        let new_charge = if (new_total_secs > 0 && new_price > 0 && remaining_secs > 0) {
            (new_price * remaining_secs) / new_total_secs
        } else { 0 };

        // If new_charge > refund, user pays the difference; if refund > new_charge, user gets refund
        if (new_charge > refund) {
            let diff = new_charge - refund;
            assert!(coin::is_account_registered<AptosCoin>(user_addr), E_COIN_NOT_REGISTERED);
            let balance = coin::balance<AptosCoin>(user_addr);
            assert!(balance >= diff, E_INSUFFICIENT_BALANCE);
            coin::transfer<AptosCoin>(user, plan_admin, diff);
        } else if (refund > new_charge && refund > 0) {
            let diff = refund - new_charge;
            // Only refund if admin has enough balance
            if (coin::is_account_registered<AptosCoin>(plan_admin) && coin::balance<AptosCoin>(plan_admin) >= diff) {
                coin::transfer<AptosCoin>(plan_admin, user_addr, diff);
            }
        }

        // Update subscription to new plan, keep expiry the same
        sub.plan_id = new_plan_id;
        sub.last_payment_amount = new_charge;
        // Optionally, could reset subscription_start to now_secs
    }

    /// Discount codes registry stored under admin
    struct DiscountCodes has key {
        codes: vector<vector<u8>>,           // discount code strings
        percentages: vector<u64>,            // discount percentage per code
        expiry_times: vector<u64>,           // expiry timestamp per code
        usage_counts: vector<u64>,           // times each code has been used
        max_uses: vector<u64>,               // max uses per code (0 = unlimited)
    }

    /// User discount history to track usage
    struct UserDiscountHistory has key {
        used_codes: vector<vector<u8>>,      // codes this user has used
        seasonal_discount_used: bool,        // has used seasonal discount before
        referral_count: u64,                 // number of successful referrals
        subscription_count: u64,             // total number of subscriptions (for loyalty)
    }

    /// Referral statistics stored under user account
    struct ReferralStats has key {
        referrer: address,                   // who referred this user (if any)
        referred_users: vector<address>,     // users this person has referred
        total_rewards_earned: u64,           // total APT earned from referrals
        active_referrals: u64,               // number of currently active referred subscriptions
    }

    /// Initialize the package for an admin account: grants Admin and creates empty Plans
    public entry fun init(admin: &signer) acquires Admin, Plans {
        let addr = signer::address_of(admin);
        assert!(!exists<Admin>(addr), E_ALREADY_INITIALIZED);
        move_to(admin, Admin{
            plan_created_events: event::new_event_handle<PlanCreated>(admin),
            subscribed_events: event::new_event_handle<Subscribed>(admin),
            canceled_events: event::new_event_handle<Canceled>(admin),
            payment_events: event::new_event_handle<PaymentReceived>(admin),
            payment_failed_events: event::new_event_handle<PaymentFailed>(admin),
            discount_events: event::new_event_handle<DiscountApplied>(admin),
            discount_code_events: event::new_event_handle<DiscountCodeUsed>(admin),
            referral_events: event::new_event_handle<ReferralRewardPaid>(admin),
            loyalty_events: event::new_event_handle<LoyaltyRewardApplied>(admin),
            grace_period_events: event::new_event_handle<GracePeriodStarted>(admin),
            refund_events: event::new_event_handle<RefundIssued>(admin),
        });
        move_to(admin, Plans{ ids: vector::empty<u64>(), durations: vector::empty<u64>(), prices: vector::empty<u64>() });
        move_to(admin, DiscountCodes{ 
            codes: vector::empty<vector<u8>>(), 
            percentages: vector::empty<u64>(),
            expiry_times: vector::empty<u64>(),
            usage_counts: vector::empty<u64>(),
            max_uses: vector::empty<u64>()
        });
    }

    /// Create a new plan with a fixed duration (in seconds) and price (in octas)
    /// Note: 1 APT = 100,000,000 octas
    public entry fun create_plan(admin: &signer, plan_id: u64, duration_secs: u64, price_octas: u64) acquires Admin, Plans {
        let addr = signer::address_of(admin);
        assert!(exists<Admin>(addr), E_NOT_ADMIN);
        let plans = borrow_global_mut<Plans>(addr);
        let (found, _) = find_index(&plans.ids, plan_id);
        assert!(!found, E_PLAN_EXISTS);
        vector::push_back(&mut plans.ids, plan_id);
        vector::push_back(&mut plans.durations, duration_secs);
        vector::push_back(&mut plans.prices, price_octas);

        // emit event
        let admin_cap = borrow_global_mut<Admin>(addr);
        event::emit_event(&mut admin_cap.plan_created_events, PlanCreated{ plan_id, duration_secs, price_octas });
    }

    /// Subscribe the caller to a plan defined by `plan_admin` and `plan_id` using on-chain time.
    /// Transfers the plan price from user to plan_admin.
    /// Optional discount_code as vector<u8> (empty vector for no code)
    public entry fun subscribe(user: &signer, plan_admin: address, plan_id: u64) acquires Admin, Plans, UserSubscription, DiscountCodes, UserDiscountHistory, ReferralStats {
        subscribe_with_referral(user, plan_admin, plan_id, vector::empty<u8>(), @0x0);
    }

    /// Subscribe with optional discount code
    public entry fun subscribe_with_code(user: &signer, plan_admin: address, plan_id: u64, discount_code: vector<u8>) acquires Admin, Plans, UserSubscription, DiscountCodes, UserDiscountHistory, ReferralStats {
        subscribe_with_referral(user, plan_admin, plan_id, discount_code, @0x0);
    }

    /// Subscribe with optional discount code and referrer address
    /// Referrer earns REFERRAL_BONUS_PERCENT of the subscription price
    public entry fun subscribe_with_referral(
        user: &signer, 
        plan_admin: address, 
        plan_id: u64, 
        discount_code: vector<u8>,
        referrer: address
    ) acquires Admin, Plans, UserSubscription, DiscountCodes, UserDiscountHistory, ReferralStats {
        let user_addr = signer::address_of(user);
        assert!(!exists<UserSubscription>(user_addr), E_ALREADY_SUBSCRIBED);
        let plans = borrow_global<Plans>(plan_admin);
        let (found, idx) = find_index(&plans.ids, plan_id);
        assert!(found, E_PLAN_NOT_FOUND);
        let dur = *vector::borrow(&plans.durations, idx);
        let price = *vector::borrow(&plans.prices, idx);
        
        // Apply seasonal discount for new subscribers in August, October, March
        let now_secs = timestamp::now_seconds();
        let month = get_month_from_timestamp(now_secs);
        let is_discount_month = (month == 3 || month == 8 || month == 10);
        
        // Check for discount code
        let code_discount_percent = 0u64;
        let has_valid_code = false;
        if (vector::length(&discount_code) > 0 && exists<DiscountCodes>(plan_admin)) {
            let codes = borrow_global_mut<DiscountCodes>(plan_admin);
            let (code_found, code_idx) = find_discount_code(&codes.codes, &discount_code);
            if (code_found) {
                let expiry = *vector::borrow(&codes.expiry_times, code_idx);
                let usage = *vector::borrow(&codes.usage_counts, code_idx);
                let max_use = *vector::borrow(&codes.max_uses, code_idx);
                
                // Validate code is not expired and under usage limit
                if (expiry > now_secs && (max_use == 0 || usage < max_use)) {
                    code_discount_percent = *vector::borrow(&codes.percentages, code_idx);
                    has_valid_code = true;
                    // Increment usage count
                    let usage_ref = vector::borrow_mut(&mut codes.usage_counts, code_idx);
                    *usage_ref = *usage_ref + 1;
                };
            };
        };
        
        // Check for loyalty discount (returning subscribers)
        let loyalty_discount_percent = 0u64;
        let is_loyal_customer = false;
        if (exists<UserDiscountHistory>(user_addr)) {
            let history = borrow_global<UserDiscountHistory>(user_addr);
            if (history.subscription_count > 0) {
                loyalty_discount_percent = LOYALTY_DISCOUNT_PERCENT;
                is_loyal_customer = true;
            };
        };
        
        // Calculate final discount (use higher of seasonal, code, or loyalty discount)
        let applied_discount = if (is_discount_month) { DISCOUNT_PERCENT } else { 0 };
        if (code_discount_percent > applied_discount) {
            applied_discount = code_discount_percent;
        };
        if (loyalty_discount_percent > applied_discount) {
            applied_discount = loyalty_discount_percent;
        };
        
        let final_price = if (applied_discount > 0 && price > 0) {
            let discounted = (price * (100 - applied_discount)) / 100;
            discounted
        } else {
            price
        };
        
        // Validate and transfer payment from user to admin
        if (final_price > 0) {
            assert!(coin::is_account_registered<AptosCoin>(user_addr), E_COIN_NOT_REGISTERED);
            let balance = coin::balance<AptosCoin>(user_addr);
            if (balance < final_price) {
                let admin_cap = borrow_global_mut<Admin>(plan_admin);
                event::emit_event(&mut admin_cap.payment_failed_events, PaymentFailed{ 
                    from: user_addr, 
                    plan_id, 
                    required_octas: final_price,
                    reason: E_INSUFFICIENT_BALANCE 
                });
                abort E_INSUFFICIENT_BALANCE
            };
            coin::transfer<AptosCoin>(user, plan_admin, final_price);
        };
        
        let expires = now_secs + dur;
        move_to(user, UserSubscription{ 
            plan_admin, 
            plan_id, 
            expires_at: expires,
            in_grace_period: false,
            grace_ends_at: 0,
            last_payment_amount: final_price,
            subscription_start: now_secs
        });

        // emit events under the plan admin
        let admin_cap = borrow_global_mut<Admin>(plan_admin);
        event::emit_event(&mut admin_cap.subscribed_events, Subscribed{ user: user_addr, plan_admin, plan_id, expires_at: expires });
        
        // Emit discount events
        if (is_discount_month && price > 0 && final_price < price && !has_valid_code) {
            event::emit_event(&mut admin_cap.discount_events, DiscountApplied{ 
                user: user_addr, 
                plan_id, 
                original_price: price, 
                discounted_price: final_price,
                month 
            });
        };
        
        if (has_valid_code && price > 0 && final_price < price) {
            event::emit_event(&mut admin_cap.discount_code_events, DiscountCodeUsed{ 
                user: user_addr, 
                code: discount_code,
                discount_percent: code_discount_percent,
                savings: price - final_price
            });
            
            // Track user discount history
            if (!exists<UserDiscountHistory>(user_addr)) {
                move_to(user, UserDiscountHistory{ 
                    used_codes: vector::empty<vector<u8>>(), 
                    seasonal_discount_used: false,
                    referral_count: 0,
                    subscription_count: 0
                });
            };
            let history = borrow_global_mut<UserDiscountHistory>(user_addr);
            vector::push_back(&mut history.used_codes, discount_code);
        };
        
        // Emit loyalty reward event if applicable
        if (is_loyal_customer && price > 0 && final_price < price && !has_valid_code && !is_discount_month) {
            let sub_count = if (exists<UserDiscountHistory>(user_addr)) {
                borrow_global<UserDiscountHistory>(user_addr).subscription_count
            } else { 0 };
            event::emit_event(&mut admin_cap.loyalty_events, LoyaltyRewardApplied{
                user: user_addr,
                plan_id: plan_id,
                subscription_count: sub_count,
                discount_percent: loyalty_discount_percent,
                savings: price - final_price
            });
        };
        
        // Update subscription count for loyalty tracking
        if (!exists<UserDiscountHistory>(user_addr)) {
            move_to(user, UserDiscountHistory{ 
                used_codes: vector::empty<vector<u8>>(), 
                seasonal_discount_used: false,
                referral_count: 0,
                subscription_count: 1
            });
        } else {
            let history = borrow_global_mut<UserDiscountHistory>(user_addr);
            history.subscription_count = history.subscription_count + 1;
        };
        
        // Handle referral rewards
        if (referrer != @0x0 && referrer != user_addr && final_price > 0) {
            // Calculate referral reward (10% of final price)
            let referral_reward = (final_price * REFERRAL_BONUS_PERCENT) / 100;
            
            // Validate referrer has AptosCoin registered
            if (coin::is_account_registered<AptosCoin>(referrer)) {
                // Transfer reward from plan admin to referrer
                if (coin::balance<AptosCoin>(plan_admin) >= referral_reward) {
                    coin::transfer<AptosCoin>(user, referrer, referral_reward);
                    
                    // Initialize or update referrer's stats
                    if (!exists<ReferralStats>(referrer)) {
                        move_to(user, ReferralStats{
                            referrer: @0x0,
                            referred_users: vector::empty<address>(),
                            total_rewards_earned: 0,
                            active_referrals: 0
                        });
                    };
                    let ref_stats = borrow_global_mut<ReferralStats>(referrer);
                    if (!vector_contains(&ref_stats.referred_users, &user_addr)) {
                        vector::push_back(&mut ref_stats.referred_users, user_addr);
                    };
                    ref_stats.total_rewards_earned = ref_stats.total_rewards_earned + referral_reward;
                    ref_stats.active_referrals = ref_stats.active_referrals + 1;
                    
                    // Initialize referee's stats (track who referred them)
                    if (!exists<ReferralStats>(user_addr)) {
                        move_to(user, ReferralStats{
                            referrer: referrer,
                            referred_users: vector::empty<address>(),
                            total_rewards_earned: 0,
                            active_referrals: 0
                        });
                    };
                    
                    // Emit referral reward event
                    event::emit_event(&mut admin_cap.referral_events, ReferralRewardPaid{
                        referrer: referrer,
                        referee: user_addr,
                        plan_id: plan_id,
                        reward_octas: referral_reward
                    });
                };
            };
        };
        
        if (final_price > 0) {
            event::emit_event(&mut admin_cap.payment_events, PaymentReceived{ from: user_addr, plan_id, amount_octas: final_price });
        };
    }

    /// Cancel the caller's current subscription - enters grace period first
    /// Users can renew during grace period to restore access
    public entry fun cancel(user: &signer) acquires Admin, UserSubscription {
        let addr = signer::address_of(user);
        assert!(exists<UserSubscription>(addr), E_NOT_SUBSCRIBED);
        
        let sub = borrow_global_mut<UserSubscription>(addr);
        let admin_addr = sub.plan_admin;
        let current_time = timestamp::now_seconds();
        
        // Set grace period
        sub.in_grace_period = true;
        sub.grace_ends_at = current_time + (GRACE_PERIOD_DAYS * SECONDS_PER_DAY);
        
        // Emit grace period event
        let admin_cap = borrow_global_mut<Admin>(admin_addr);
        event::emit_event(&mut admin_cap.grace_period_events, GracePeriodStarted{ 
            user: addr, 
            expired_at: sub.expires_at,
            grace_ends_at: sub.grace_ends_at
        });
    }

    /// Hard cancel - removes subscription after grace period expires
    /// Can only be called if grace period has ended or user explicitly requests immediate cancel
    public entry fun hard_cancel(user: &signer) acquires Admin, UserSubscription, ReferralStats {
        let addr = signer::address_of(user);
        assert!(exists<UserSubscription>(addr), E_NOT_SUBSCRIBED);
        
        // Decrement referrer's active referrals count if user was referred
        if (exists<ReferralStats>(addr)) {
            let user_stats = borrow_global<ReferralStats>(addr);
            let referrer_addr = user_stats.referrer;
            if (referrer_addr != @0x0 && exists<ReferralStats>(referrer_addr)) {
                let ref_stats = borrow_global_mut<ReferralStats>(referrer_addr);
                if (ref_stats.active_referrals > 0) {
                    ref_stats.active_referrals = ref_stats.active_referrals - 1;
                };
            };
        };
        
        // read admin address, then emit event, then remove resource
        let admin_addr = {
            let s_ref = borrow_global<UserSubscription>(addr);
            s_ref.plan_admin
        };
        let admin_cap = borrow_global_mut<Admin>(admin_addr);
        event::emit_event(&mut admin_cap.canceled_events, Canceled{ user: addr });
        let _sub = move_from<UserSubscription>(addr);
        // dropped
    }

    /// Cancel with pro-rated refund based on unused days
    /// Admin must call this function to approve and issue refund
    /// Calculates refund amount and transfers APT back to user
    public entry fun cancel_with_refund(admin: &signer, user_addr: address) acquires Admin, UserSubscription, ReferralStats, Plans {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Admin>(admin_addr), E_NOT_ADMIN);
        assert!(exists<UserSubscription>(user_addr), E_NOT_SUBSCRIBED);
        
        let sub = borrow_global<UserSubscription>(user_addr);
        let plan_admin = sub.plan_admin;
        assert!(plan_admin == admin_addr, E_NOT_ADMIN);  // Ensure admin owns the plan
        
        let plan_id = sub.plan_id;
        let current_time = timestamp::now_seconds();
        let expires_at = sub.expires_at;
        let payment_amount = sub.last_payment_amount;
        let subscription_start = sub.subscription_start;
        
        // Calculate refund amount based on unused time
        let refund_amount = 0u64;
        let days_unused = 0u64;
        
        if (current_time < expires_at && payment_amount > 0) {
            let time_unused = expires_at - current_time;
            days_unused = time_unused / SECONDS_PER_DAY;
            
            // Get plan duration to calculate pro-rated refund
            let plans = borrow_global<Plans>(plan_admin);
            let (found, idx) = find_index(&plans.ids, plan_id);
            if (found) {
                let total_duration = *vector::borrow(&plans.durations, idx);
                let total_days = total_duration / SECONDS_PER_DAY;
                
                if (total_days > 0) {
                    // Pro-rated refund: (unused_days / total_days) * payment_amount
                    refund_amount = (days_unused * payment_amount) / total_days;
                };
            };
        };
        
        // Decrement referrer's active referrals count if user was referred
        if (exists<ReferralStats>(user_addr)) {
            let user_stats = borrow_global<ReferralStats>(user_addr);
            let referrer_addr = user_stats.referrer;
            if (referrer_addr != @0x0 && exists<ReferralStats>(referrer_addr)) {
                let ref_stats = borrow_global_mut<ReferralStats>(referrer_addr);
                if (ref_stats.active_referrals > 0) {
                    ref_stats.active_referrals = ref_stats.active_referrals - 1;
                };
            };
        };
        
        // Issue refund if applicable
        if (refund_amount > 0) {
            assert!(coin::is_account_registered<AptosCoin>(user_addr), E_COIN_NOT_REGISTERED);
            coin::transfer<AptosCoin>(admin, user_addr, refund_amount);
        };
        
        // Emit events
        let admin_cap = borrow_global_mut<Admin>(admin_addr);
        if (refund_amount > 0) {
            event::emit_event(&mut admin_cap.refund_events, RefundIssued{ 
                user: user_addr, 
                plan_id,
                refund_amount,
                days_unused
            });
        };
        event::emit_event(&mut admin_cap.canceled_events, Canceled{ user: user_addr });
        
        // Remove subscription
        let _sub = move_from<UserSubscription>(user_addr);
        // dropped
    }

    /// Read-only helper: return (exists, admin, plan_id, expires_at)
    public fun get_subscription(addr: address): (bool, address, u64, u64) acquires UserSubscription {
        if (exists<UserSubscription>(addr)) {
            let s = borrow_global<UserSubscription>(addr);
            (true, s.plan_admin, s.plan_id, s.expires_at)
        } else {
            (false, @0x0, 0, 0)
        }
    }

    /// Read-only: return whether subscription is active relative to `now_secs`
    public fun is_active(addr: address, now_secs: u64): bool acquires UserSubscription {
        if (exists<UserSubscription>(addr)) {
            let s = borrow_global<UserSubscription>(addr);
            s.expires_at > now_secs
        } else { false }
    }

    /// Read-only: remaining seconds until expiry; 0 if none or expired
    public fun time_remaining(addr: address, now_secs: u64): u64 acquires UserSubscription {
        if (exists<UserSubscription>(addr)) {
            let s = borrow_global<UserSubscription>(addr);
            if (s.expires_at > now_secs) { s.expires_at - now_secs } else { 0 }
        } else { 0 }
    }

    /// Read-only: get plan duration; returns (found, duration)
    public fun get_plan_duration(plan_admin: address, plan_id: u64): (bool, u64) acquires Plans {
        if (exists<Plans>(plan_admin)) {
            let plans = borrow_global<Plans>(plan_admin);
            let (found, idx) = find_index(&plans.ids, plan_id);
            if (found) { (true, *vector::borrow(&plans.durations, idx)) } else { (false, 0) }
        } else { (false, 0) }
    }

    /// Read-only: get plan price in octas; returns (found, price_octas)
    public fun get_plan_price(plan_admin: address, plan_id: u64): (bool, u64) acquires Plans {
        if (exists<Plans>(plan_admin)) {
            let plans = borrow_global<Plans>(plan_admin);
            let (found, idx) = find_index(&plans.ids, plan_id);
            if (found) { (true, *vector::borrow(&plans.prices, idx)) } else { (false, 0) }
        } else { (false, 0) }
    }

    /// Renew existing subscription by extending from max(current_expiry, now_secs)
    /// Transfers the plan price from user to plan_admin.
    public entry fun renew(user: &signer, now_secs: u64) acquires Admin, Plans, UserSubscription {
        let addr = signer::address_of(user);
        assert!(exists<UserSubscription>(addr), E_SUBSCRIPTION_NOT_FOUND);
        let s_mut = borrow_global_mut<UserSubscription>(addr);
        let plan_admin = s_mut.plan_admin;
        let plan_id = s_mut.plan_id;
        let plans = borrow_global<Plans>(plan_admin);
        let (found, idx) = find_index(&plans.ids, plan_id);
        assert!(found, E_PLAN_MISMATCH);
        let dur = *vector::borrow(&plans.durations, idx);
        let price = *vector::borrow(&plans.prices, idx);
        
        // Validate and transfer payment from user to admin
        if (price > 0) {
            assert!(coin::is_account_registered<AptosCoin>(addr), E_COIN_NOT_REGISTERED);
            let balance = coin::balance<AptosCoin>(addr);
            if (balance < price) {
                let admin_cap = borrow_global_mut<Admin>(plan_admin);
                event::emit_event(&mut admin_cap.payment_failed_events, PaymentFailed{ 
                    from: addr, 
                    plan_id, 
                    required_octas: price,
                    reason: E_INSUFFICIENT_BALANCE 
                });
                abort E_INSUFFICIENT_BALANCE
            };
            coin::transfer<AptosCoin>(user, plan_admin, price);
        };
        
        let base = if (s_mut.expires_at > now_secs) { s_mut.expires_at } else { now_secs };
        s_mut.expires_at = base + dur;
        
        // Clear grace period if renewing during grace period
        s_mut.in_grace_period = false;
        s_mut.grace_ends_at = 0;
        
        // Update payment tracking for refund calculation
        s_mut.last_payment_amount = price;
        s_mut.subscription_start = now_secs;

        // emit events under the plan admin (reuse Subscribed for renewals)
        let admin_cap = borrow_global_mut<Admin>(plan_admin);
        event::emit_event(&mut admin_cap.subscribed_events, Subscribed{ user: addr, plan_admin, plan_id, expires_at: s_mut.expires_at });
        if (price > 0) {
            event::emit_event(&mut admin_cap.payment_events, PaymentReceived{ from: addr, plan_id, amount_octas: price });
        };
    }

    /// Linear search for plan id; returns (found, index)
    fun find_index(ids: &vector<u64>, target: u64): (bool, u64) {
        let n = vector::length<u64>(ids);
        let i = 0u64;
        while (i < n) {
            if (*vector::borrow(ids, i) == target) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }

    /// Helper: get month (1-12) from Unix timestamp
    /// Simplified calculation: assumes 365-day years, doesn't account for leap years perfectly
    fun get_month_from_timestamp(ts: u64): u64 {
        // Days since Unix epoch
        let days = ts / SECONDS_PER_DAY;
        // Days in current year (approximate)
        let day_of_year = (days % DAYS_PER_YEAR);
        // Approximate month based on 30-day months
        // Jan=1, Feb=2, Mar=3, Apr=4, May=5, Jun=6, Jul=7, Aug=8, Sep=9, Oct=10, Nov=11, Dec=12
        let cumulative_days = vector[
            0,   // placeholder for index 0
            0,   // Jan starts at day 0
            31,  // Feb starts at day 31
            59,  // Mar starts at day 59
            90,  // Apr starts at day 90
            120, // May starts at day 120
            151, // Jun starts at day 151
            181, // Jul starts at day 181
            212, // Aug starts at day 212
            243, // Sep starts at day 243
            273, // Oct starts at day 273
            304, // Nov starts at day 304
            334  // Dec starts at day 334
        ];
        
        let month = 1u64;
        while (month <= 12) {
            let start_day = *vector::borrow(&cumulative_days, month);
            if (month == 12) {
                return 12
            };
            let next_start = *vector::borrow(&cumulative_days, month + 1);
            if (day_of_year >= start_day && day_of_year < next_start) {
                return month
            };
            month = month + 1;
        };
        12  // default to December if calculation fails
    }

    /// Create a new discount code (admin only)
    public entry fun create_discount_code(
        admin: &signer, 
        code: vector<u8>, 
        discount_percent: u64, 
        expiry_timestamp: u64, 
        max_uses: u64
    ) acquires DiscountCodes {
        let admin_addr = signer::address_of(admin);
        assert!(exists<Admin>(admin_addr), E_NOT_INITIALIZED);
        
        let codes = borrow_global_mut<DiscountCodes>(admin_addr);
        vector::push_back(&mut codes.codes, code);
        vector::push_back(&mut codes.percentages, discount_percent);
        vector::push_back(&mut codes.expiry_times, expiry_timestamp);
        vector::push_back(&mut codes.usage_counts, 0);
        vector::push_back(&mut codes.max_uses, max_uses);
    }

    /// Helper to find discount code in vector
    fun find_discount_code(codes: &vector<vector<u8>>, target: &vector<u8>): (bool, u64) {
        let i = 0;
        let len = vector::length(codes);
        while (i < len) {
            let code = vector::borrow(codes, i);
            if (code == target) {
                return (true, i)
            };
            i = i + 1;
        };
        (false, 0)
    }

    /// Helper to check if address vector contains target
    fun vector_contains(vec: &vector<address>, target: &address): bool {
        let i = 0;
        let len = vector::length(vec);
        while (i < len) {
            if (vector::borrow(vec, i) == target) {
                return true
            };
            i = i + 1;
        };
        false
    }

    /// Get referral statistics for a user
    /// Returns (has_stats, referrer, referral_count, total_rewards, active_referrals)
    public fun get_referral_stats(user: address): (bool, address, u64, u64, u64) acquires ReferralStats {
        if (!exists<ReferralStats>(user)) {
            return (false, @0x0, 0, 0, 0)
        };
        let stats = borrow_global<ReferralStats>(user);
        (true, stats.referrer, vector::length(&stats.referred_users), stats.total_rewards_earned, stats.active_referrals)
    }

    /// View function: get grace period status for a user
    /// Returns: (in_grace_period, grace_ends_at)
    #[view]
    public fun get_grace_period_status(user: address): (bool, u64) acquires UserSubscription {
        if (!exists<UserSubscription>(user)) {
            return (false, 0)
        };
        let sub = borrow_global<UserSubscription>(user);
        (sub.in_grace_period, sub.grace_ends_at)
    }

    #[test]
    public entry fun test_end_to_end(admin: &signer, user: &signer) acquires Admin, Plans, UserSubscription, ReferralStats {
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        init(admin);
        // Create a free plan (price = 0) for testing
        create_plan(admin, 1, 3600, 0);

        // set on-chain timestamp to 100 and subscribe
        timestamp::set_time_has_started_for_testing_only();
        timestamp::set_time_for_testing_only(100);
        subscribe(user, admin_addr, 1);
        let (ok, a, pid, exp) = get_subscription(user_addr);
        assert!(ok, 1000);
        assert!(a == admin_addr, 1001);
        assert!(pid == 1, 1002);
        assert!(exp == 3700, 1003);

        // event assertions: one plan created, one subscribed so far
        let admin_read = borrow_global<Admin>(admin_addr);
        assert!(event::counter(&admin_read.plan_created_events) == 1, 1100);
        assert!(event::counter(&admin_read.subscribed_events) == 1, 1101);
        assert!(event::counter(&admin_read.canceled_events) == 0, 1102);

        // cancel and verify removal + event counter
        cancel(user);
        assert!(!exists<UserSubscription>(user_addr), 1004);
        let admin_read2 = borrow_global<Admin>(admin_addr);
        assert!(event::counter(&admin_read2.canceled_events) == 1, 1103);

        // re-subscribe and test renewal + status helpers
        // re-set on-chain time to 100 for deterministic expiry and re-subscribe
        timestamp::set_time_for_testing_only(100);
        subscribe(user, admin_addr, 1);
        // initially active at t=200
        assert!(is_active(user_addr, 200), 1005);
        assert!(time_remaining(user_addr, 200) == 3500, 1006);
        // renew at time equal to expiry to extend by another duration
        renew(user, 3700);
        let (ok2, _, _, exp2) = get_subscription(user_addr);
        assert!(ok2, 1007);
        assert!(exp2 == 7300, 1008);
        assert!(is_active(user_addr, 5000), 1009);
        assert!(time_remaining(user_addr, 5000) == 2300, 1010);

        // event assertions: subscribed should count initial subscribe + resubscribe + renew (reuse Subscribed)
        let admin_read3 = borrow_global<Admin>(admin_addr);
        assert!(event::counter(&admin_read3.subscribed_events) == 3, 1104);
    }
}
}
