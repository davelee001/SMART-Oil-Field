module subscriptions::subscription {
    use std::signer;
    use std::vector;
    use aptos_std::event;
    use aptos_std::timestamp;

    /// Event types
    struct PlanCreated has drop, store { plan_id: u64, duration_secs: u64 }
    struct Subscribed has drop, store { user: address, plan_admin: address, plan_id: u64, expires_at: u64 }
    struct Canceled has drop, store { user: address }

    /// Capability + event handles stored under the admin account
    struct Admin has key {
        plan_created_events: event::EventHandle<PlanCreated>,
        subscribed_events: event::EventHandle<Subscribed>,
        canceled_events: event::EventHandle<Canceled>,
    }

    /// Plans registry stored under the admin account
    struct Plans has key {
        ids: vector<u64>,            // plan ids
        durations: vector<u64>,      // duration in seconds per plan id
    }

    /// User subscription stored under the subscriber account
    struct UserSubscription has key {
        plan_admin: address,
        plan_id: u64,
        expires_at: u64,
    }

    /// Initialize the package for an admin account: grants Admin and creates empty Plans
    public entry fun init(admin: &signer) acquires Admin, Plans {
        let addr = signer::address_of(admin);
        assert!(!exists<Admin>(addr), 1);
        move_to(admin, Admin{
            plan_created_events: event::new_event_handle<PlanCreated>(admin),
            subscribed_events: event::new_event_handle<Subscribed>(admin),
            canceled_events: event::new_event_handle<Canceled>(admin),
        });
        move_to(admin, Plans{ ids: vector::empty<u64>(), durations: vector::empty<u64>() });
    }

    /// Create a new plan with a fixed duration (in seconds)
    public entry fun create_plan(admin: &signer, plan_id: u64, duration_secs: u64) acquires Admin, Plans {
        let addr = signer::address_of(admin);
        assert!(exists<Admin>(addr), 2);
        let plans = borrow_global_mut<Plans>(addr);
        let (found, _) = find_index(&plans.ids, plan_id);
        assert!(!found, 3);
        vector::push_back(&mut plans.ids, plan_id);
        vector::push_back(&mut plans.durations, duration_secs);

        // emit event
        let admin_cap = borrow_global_mut<Admin>(addr);
        event::emit_event(&mut admin_cap.plan_created_events, PlanCreated{ plan_id, duration_secs });
    }

    /// Subscribe the caller to a plan defined by `plan_admin` and `plan_id`. `now_secs` is the current timestamp.
    public entry fun subscribe(user: &signer, plan_admin: address, plan_id: u64, now_secs: u64) acquires Admin, Plans, UserSubscription {
        let user_addr = signer::address_of(user);
        assert!(!exists<UserSubscription>(user_addr), 4);
        let plans = borrow_global<Plans>(plan_admin);
        let (found, idx) = find_index(&plans.ids, plan_id);
        assert!(found, 5);
        let dur = *vector::borrow(&plans.durations, idx);
        let expires = now_secs + dur;
        move_to(user, UserSubscription{ plan_admin, plan_id, expires_at: expires });

        // emit event under the plan admin
        let admin_cap = borrow_global_mut<Admin>(plan_admin);
        event::emit_event(&mut admin_cap.subscribed_events, Subscribed{ user: user_addr, plan_admin, plan_id, expires_at: expires });
    }

    /// Subscribe using on-chain time source
    public entry fun subscribe_now(user: &signer, plan_admin: address, plan_id: u64) acquires Admin, Plans, UserSubscription {
        let now = timestamp::now_seconds();
        subscribe(user, plan_admin, plan_id, now);
    }

    /// Cancel the caller's current subscription (if any)
    public entry fun cancel(user: &signer) acquires Admin, UserSubscription {
        let addr = signer::address_of(user);
        assert!(exists<UserSubscription>(addr), 6);
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

    /// Renew existing subscription by extending from max(current_expiry, now_secs)
    public entry fun renew(user: &signer, now_secs: u64) acquires Admin, Plans, UserSubscription {
        let addr = signer::address_of(user);
        assert!(exists<UserSubscription>(addr), 7);
        let s_mut = borrow_global_mut<UserSubscription>(addr);
        let plan_admin = s_mut.plan_admin;
        let plan_id = s_mut.plan_id;
        let plans = borrow_global<Plans>(plan_admin);
        let (found, idx) = find_index(&plans.ids, plan_id);
        assert!(found, 8);
        let dur = *vector::borrow(&plans.durations, idx);
        let base = if (s_mut.expires_at > now_secs) { s_mut.expires_at } else { now_secs };
        s_mut.expires_at = base + dur;

        // emit event under the plan admin (reuse Subscribed for renewals)
        let admin_cap = borrow_global_mut<Admin>(plan_admin);
        event::emit_event(&mut admin_cap.subscribed_events, Subscribed{ user: addr, plan_admin, plan_id, expires_at: s_mut.expires_at });
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

    #[test]
    public entry fun test_end_to_end(admin: &signer, user: &signer) acquires Admin, Plans, UserSubscription {
        let admin_addr = signer::address_of(admin);
        let user_addr = signer::address_of(user);

        init(admin);
        create_plan(admin, 1, 3600);

        // subscribe at timestamp 100
        subscribe(user, admin_addr, 1, 100);
        let (ok, a, pid, exp) = get_subscription(user_addr);
        assert!(ok, 1000);
        assert!(a == admin_addr, 1001);
        assert!(pid == 1, 1002);
        assert!(exp == 3700, 1003);

        // cancel and verify removal
        cancel(user);
        assert!(!exists<UserSubscription>(user_addr), 1004);

        // re-subscribe and test renewal + status helpers
        subscribe(user, admin_addr, 1, 100);
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
    }
}
