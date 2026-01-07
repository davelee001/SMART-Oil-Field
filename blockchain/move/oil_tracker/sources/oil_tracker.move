module oil_tracker::tracker {
    use std::string::{Self, String};
    use std::signer;
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_std::table::{Self, Table};

    // Error codes
    const E_BATCH_ALREADY_EXISTS: u64 = 1;
    const E_BATCH_NOT_FOUND: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_STAGE: u64 = 4;

    // Lifecycle stages
    const STAGE_DRILLING: u64 = 0;
    const STAGE_EXTRACTION: u64 = 1;
    const STAGE_STORAGE: u64 = 2;
    const STAGE_TRANSPORT: u64 = 3;
    const STAGE_REFINING: u64 = 4;
    const STAGE_DISTRIBUTION: u64 = 5;
    const STAGE_DELIVERED: u64 = 6;

    /// Oil batch stored on-chain
    struct OilBatch has store {
        batch_id: String,
        origin: String,
        volume: u64,          // volume in units (e.g., barrels * 1000)
        unit: String,
        created_at: u64,
        current_stage: u64,
        owner: address,
        status: String,
        event_count: u64,
    }

    /// Lifecycle event for tracking
    struct LifecycleEvent has store {
        timestamp: u64,
        stage: u64,
        status: String,
        facility: String,
        notes: String,
    }

    /// Batch registry - stores all batches
    struct BatchRegistry has key {
        batches: Table<String, OilBatch>,
        events: Table<String, vector<LifecycleEvent>>, // batch_id -> events
    }

    // Events
    #[event]
    struct BatchCreated has drop, store {
        batch_id: String,
        origin: String,
        volume: u64,
        owner: address,
        timestamp: u64,
    }

    #[event]
    struct EventAdded has drop, store {
        batch_id: String,
        stage: u64,
        status: String,
        facility: String,
        timestamp: u64,
    }

    #[event]
    struct BatchTransferred has drop, store {
        batch_id: String,
        from: address,
        to: address,
        timestamp: u64,
    }

    /// Initialize the batch registry (only once per account)
    public entry fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<BatchRegistry>(account_addr)) {
            move_to(account, BatchRegistry {
                batches: table::new(),
                events: table::new(),
            });
        };
    }

    /// Create a new oil batch on-chain
    public entry fun create_batch(
        account: &signer,
        batch_id: String,
        origin: String,
        volume: u64,
        unit: String,
    ) acquires BatchRegistry {
        let account_addr = signer::address_of(account);
        
        // Ensure registry exists
        if (!exists<BatchRegistry>(account_addr)) {
            initialize(account);
        };

        let registry = borrow_global_mut<BatchRegistry>(account_addr);
        
        // Check batch doesn't exist
        assert!(!table::contains(&registry.batches, batch_id), E_BATCH_ALREADY_EXISTS);

        let now = timestamp::now_seconds();
        
        // Create batch
        let batch = OilBatch {
            batch_id,
            origin,
            volume,
            unit,
            created_at: now,
            current_stage: STAGE_DRILLING,
            owner: account_addr,
            status: string::utf8(b"INITIATED"),
            event_count: 0,
        };

        // Store batch
        table::add(&mut registry.batches, batch_id, batch);
        
        // Initialize events vector
        table::add(&mut registry.events, batch_id, vector::empty<LifecycleEvent>());

        // Emit event
        event::emit(BatchCreated {
            batch_id,
            origin,
            volume,
            owner: account_addr,
            timestamp: now,
        });
    }

    /// Add a lifecycle event to a batch
    public entry fun add_event(
        account: &signer,
        batch_id: String,
        stage: u64,
        status: String,
        facility: String,
        notes: String,
    ) acquires BatchRegistry {
        let account_addr = signer::address_of(account);
        
        assert!(exists<BatchRegistry>(account_addr), E_BATCH_NOT_FOUND);
        let registry = borrow_global_mut<BatchRegistry>(account_addr);
        
        // Verify batch exists and caller is owner
        assert!(table::contains(&registry.batches, batch_id), E_BATCH_NOT_FOUND);
        let batch = table::borrow_mut(&mut registry.batches, batch_id);
        assert!(batch.owner == account_addr, E_UNAUTHORIZED);
        assert!(stage <= STAGE_DELIVERED, E_INVALID_STAGE);

        let now = timestamp::now_seconds();

        // Create event
        let lifecycle_event = LifecycleEvent {
            timestamp: now,
            stage,
            status,
            facility,
            notes,
        };

        // Add to events
        let events = table::borrow_mut(&mut registry.events, batch_id);
        vector::push_back(events, lifecycle_event);

        // Update batch
        batch.current_stage = stage;
        batch.status = status;
        batch.event_count = batch.event_count + 1;

        // Emit event
        event::emit(EventAdded {
            batch_id,
            stage,
            status,
            facility,
            timestamp: now,
        });
    }

    /// Transfer batch ownership
    public entry fun transfer_batch(
        account: &signer,
        batch_id: String,
        new_owner: address,
    ) acquires BatchRegistry {
        let account_addr = signer::address_of(account);
        
        assert!(exists<BatchRegistry>(account_addr), E_BATCH_NOT_FOUND);
        let registry = borrow_global_mut<BatchRegistry>(account_addr);
        
        assert!(table::contains(&registry.batches, batch_id), E_BATCH_NOT_FOUND);
        let batch = table::borrow_mut(&mut registry.batches, batch_id);
        assert!(batch.owner == account_addr, E_UNAUTHORIZED);

        let now = timestamp::now_seconds();
        
        // Transfer ownership
        batch.owner = new_owner;

        // Emit event
        event::emit(BatchTransferred {
            batch_id,
            from: account_addr,
            to: new_owner,
            timestamp: now,
        });
    }

    // View functions (for querying)
    
    #[view]
    public fun get_batch_stage(owner: address, batch_id: String): u64 acquires BatchRegistry {
        let registry = borrow_global<BatchRegistry>(owner);
        assert!(table::contains(&registry.batches, batch_id), E_BATCH_NOT_FOUND);
        let batch = table::borrow(&registry.batches, batch_id);
        batch.current_stage
    }

    #[view]
    public fun get_batch_owner(owner: address, batch_id: String): address acquires BatchRegistry {
        let registry = borrow_global<BatchRegistry>(owner);
        assert!(table::contains(&registry.batches, batch_id), E_BATCH_NOT_FOUND);
        let batch = table::borrow(&registry.batches, batch_id);
        batch.owner
    }

    #[view]
    public fun get_event_count(owner: address, batch_id: String): u64 acquires BatchRegistry {
        let registry = borrow_global<BatchRegistry>(owner);
        assert!(table::contains(&registry.batches, batch_id), E_BATCH_NOT_FOUND);
        let batch = table::borrow(&registry.batches, batch_id);
        batch.event_count
    }

    #[view]
    public fun batch_exists(owner: address, batch_id: String): bool acquires BatchRegistry {
        if (!exists<BatchRegistry>(owner)) {
            return false
        };
        let registry = borrow_global<BatchRegistry>(owner);
        table::contains(&registry.batches, batch_id)
    }

    // Helper function to convert stage to string
    #[view]
    public fun stage_to_string(stage: u64): String {
        if (stage == STAGE_DRILLING) { string::utf8(b"DRILLING") }
        else if (stage == STAGE_EXTRACTION) { string::utf8(b"EXTRACTION") }
        else if (stage == STAGE_STORAGE) { string::utf8(b"STORAGE") }
        else if (stage == STAGE_TRANSPORT) { string::utf8(b"TRANSPORT") }
        else if (stage == STAGE_REFINING) { string::utf8(b"REFINING") }
        else if (stage == STAGE_DISTRIBUTION) { string::utf8(b"DISTRIBUTION") }
        else if (stage == STAGE_DELIVERED) { string::utf8(b"DELIVERED") }
        else { string::utf8(b"UNKNOWN") }
    }
}
