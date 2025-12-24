module subscriptions::subscription {
    use std::signer;

    struct Subscription has key {
        plan_id: u64,
        expires_at: u64,
    }

    public entry fun init(_admin: &signer) {
        // TODO: set up roles/registry
    }
}
