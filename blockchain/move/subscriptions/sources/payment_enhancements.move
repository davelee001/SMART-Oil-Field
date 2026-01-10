/// Payment Enhancements Module
/// Provides multi-token support, installment payments, stablecoin pricing, 
/// payment receipts/invoices, and escrow for disputed payments
module subscriptions::payment_enhancements {
    use std::signer;
    use std::vector;
    use std::string::{Self, String};
    use aptos_std::event;
    use aptos_std::timestamp;
    use aptos_std::table::{Self, Table};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    
    // Mock USDC and USDT - in production, these would be imported from actual deployed contracts
    struct USDC {}
    struct USDT {}

    /// Error codes
    const E_NOT_INITIALIZED: u64 = 1;
    const E_UNSUPPORTED_TOKEN: u64 = 2;
    const E_INSUFFICIENT_BALANCE: u64 = 3;
    const E_COIN_NOT_REGISTERED: u64 = 4;
    const E_INVALID_INSTALLMENT_PLAN: u64 = 5;
    const E_INSTALLMENT_NOT_FOUND: u64 = 6;
    const E_PAYMENT_ALREADY_MADE: u64 = 7;
    const E_RECEIPT_NOT_FOUND: u64 = 8;
    const E_ESCROW_NOT_FOUND: u64 = 9;
    const E_UNAUTHORIZED: u64 = 10;
    const E_DISPUTE_ALREADY_RESOLVED: u64 = 11;
    const E_INVALID_PRICE_FEED: u64 = 12;

    /// Supported payment token types
    const TOKEN_APT: u8 = 0;
    const TOKEN_USDC: u8 = 1;
    const TOKEN_USDT: u8 = 2;

    /// Installment frequency
    const FREQUENCY_MONTHLY: u8 = 1;
    const FREQUENCY_QUARTERLY: u8 = 3;
    const FREQUENCY_ANNUALLY: u8 = 12;

    /// Escrow status
    const ESCROW_PENDING: u8 = 0;
    const ESCROW_RELEASED: u8 = 1;
    const ESCROW_REFUNDED: u8 = 2;
    const ESCROW_DISPUTED: u8 = 3;

    /// Stablecoin price feed (simplified - in production use an oracle)
    struct PriceFeed has key {
        apt_to_usd: u64,  // APT price in USD cents (e.g., 1000 = $10.00)
        usdc_to_usd: u64, // USDC price in USD cents (usually 100 = $1.00)
        usdt_to_usd: u64, // USDT price in USD cents (usually 100 = $1.00)
        last_updated: u64,
    }

    /// Installment payment plan
    struct InstallmentPlan has store {
        plan_id: u64,
        payer: address,
        total_amount: u64,
        num_installments: u64,
        installment_amount: u64,
        frequency: u8,  // monthly, quarterly, annually
        token_type: u8,
        payments_made: u64,
        next_payment_due: u64,
        created_at: u64,
        completed: bool,
    }

    /// Payment receipt/invoice
    struct PaymentReceipt has store, copy, drop {
        receipt_id: u64,
        payer: address,
        payee: address,
        amount: u64,
        token_type: u8,
        payment_type: String,  // "subscription", "installment", etc.
        reference_id: u64,  // plan_id or subscription_id
        timestamp: u64,
        notes: String,
    }

    /// Escrow for disputed payments
    struct PaymentEscrow has store {
        escrow_id: u64,
        payer: address,
        payee: address,
        amount: u64,
        token_type: u8,
        status: u8,
        created_at: u64,
        dispute_reason: String,
        resolution_notes: String,
    }

    /// Payment registry for installments, receipts, and escrows
    struct PaymentRegistry has key {
        installment_plans: Table<u64, InstallmentPlan>,
        receipts: Table<u64, PaymentReceipt>,
        escrows: Table<u64, PaymentEscrow>,
        next_plan_id: u64,
        next_receipt_id: u64,
        next_escrow_id: u64,
    }

    /// Events
    struct MultiTokenPaymentMade has drop, store {
        payer: address,
        payee: address,
        amount: u64,
        token_type: u8,
        timestamp: u64,
    }

    struct InstallmentPlanCreated has drop, store {
        plan_id: u64,
        payer: address,
        total_amount: u64,
        num_installments: u64,
        frequency: u8,
        timestamp: u64,
    }

    struct InstallmentPaymentMade has drop, store {
        plan_id: u64,
        payer: address,
        payment_number: u64,
        amount: u64,
        timestamp: u64,
    }

    struct ReceiptIssued has drop, store {
        receipt_id: u64,
        payer: address,
        payee: address,
        amount: u64,
        timestamp: u64,
    }

    struct EscrowCreated has drop, store {
        escrow_id: u64,
        payer: address,
        payee: address,
        amount: u64,
        timestamp: u64,
    }

    struct EscrowResolved has drop, store {
        escrow_id: u64,
        status: u8,
        timestamp: u64,
    }

    struct PriceFeedUpdated has drop, store {
        apt_to_usd: u64,
        usdc_to_usd: u64,
        usdt_to_usd: u64,
        timestamp: u64,
    }

    /// Initialize the payment system
    public entry fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<PaymentRegistry>(account_addr)) {
            move_to(account, PaymentRegistry {
                installment_plans: table::new(),
                receipts: table::new(),
                escrows: table::new(),
                next_plan_id: 1,
                next_receipt_id: 1,
                next_escrow_id: 1,
            });
        };

        if (!exists<PriceFeed>(account_addr)) {
            move_to(account, PriceFeed {
                apt_to_usd: 1000,  // $10.00 per APT (example)
                usdc_to_usd: 100,  // $1.00 per USDC
                usdt_to_usd: 100,  // $1.00 per USDT
                last_updated: timestamp::now_seconds(),
            });
        };
    }

    /// Update price feed (admin only - in production use oracle)
    public entry fun update_price_feed(
        admin: &signer,
        apt_to_usd: u64,
        usdc_to_usd: u64,
        usdt_to_usd: u64,
    ) acquires PriceFeed {
        let admin_addr = signer::address_of(admin);
        assert!(exists<PriceFeed>(admin_addr), E_NOT_INITIALIZED);
        
        let feed = borrow_global_mut<PriceFeed>(admin_addr);
        feed.apt_to_usd = apt_to_usd;
        feed.usdc_to_usd = usdc_to_usd;
        feed.usdt_to_usd = usdt_to_usd;
        feed.last_updated = timestamp::now_seconds();

        event::emit(PriceFeedUpdated {
            apt_to_usd,
            usdc_to_usd,
            usdt_to_usd,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Make a multi-token payment (APT, USDC, or USDT)
    public entry fun make_payment_apt(
        payer: &signer,
        payee: address,
        amount: u64,
    ) acquires PaymentRegistry {
        make_payment_internal<AptosCoin>(payer, payee, amount, TOKEN_APT);
    }

    public entry fun make_payment_usdc(
        payer: &signer,
        payee: address,
        amount: u64,
    ) acquires PaymentRegistry {
        make_payment_internal<USDC>(payer, payee, amount, TOKEN_USDC);
    }

    public entry fun make_payment_usdt(
        payer: &signer,
        payee: address,
        amount: u64,
    ) acquires PaymentRegistry {
        make_payment_internal<USDT>(payer, payee, amount, TOKEN_USDT);
    }

    fun make_payment_internal<CoinType>(
        payer: &signer,
        payee: address,
        amount: u64,
        token_type: u8,
    ) acquires PaymentRegistry {
        let payer_addr = signer::address_of(payer);
        
        // Validate balance
        assert!(coin::is_account_registered<CoinType>(payer_addr), E_COIN_NOT_REGISTERED);
        let balance = coin::balance<CoinType>(payer_addr);
        assert!(balance >= amount, E_INSUFFICIENT_BALANCE);

        // Transfer
        coin::transfer<CoinType>(payer, payee, amount);

        // Issue receipt
        issue_receipt(payer_addr, payee, amount, token_type, string::utf8(b"direct_payment"), 0);

        event::emit(MultiTokenPaymentMade {
            payer: payer_addr,
            payee,
            amount,
            token_type,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Create an installment payment plan
    public entry fun create_installment_plan(
        payer: &signer,
        total_amount: u64,
        num_installments: u64,
        frequency: u8,
        token_type: u8,
    ) acquires PaymentRegistry {
        let payer_addr = signer::address_of(payer);
        
        assert!(exists<PaymentRegistry>(payer_addr), E_NOT_INITIALIZED);
        assert!(num_installments > 0 && num_installments <= 24, E_INVALID_INSTALLMENT_PLAN);
        assert!(
            frequency == FREQUENCY_MONTHLY || 
            frequency == FREQUENCY_QUARTERLY || 
            frequency == FREQUENCY_ANNUALLY,
            E_INVALID_INSTALLMENT_PLAN
        );

        let registry = borrow_global_mut<PaymentRegistry>(payer_addr);
        let plan_id = registry.next_plan_id;
        registry.next_plan_id = plan_id + 1;

        let installment_amount = total_amount / num_installments;
        let now = timestamp::now_seconds();
        let seconds_per_month = 30 * 24 * 60 * 60; // ~30 days
        let next_payment_due = now + ((frequency as u64) * seconds_per_month);

        let plan = InstallmentPlan {
            plan_id,
            payer: payer_addr,
            total_amount,
            num_installments,
            installment_amount,
            frequency,
            token_type,
            payments_made: 0,
            next_payment_due,
            created_at: now,
            completed: false,
        };

        table::add(&mut registry.installment_plans, plan_id, plan);

        event::emit(InstallmentPlanCreated {
            plan_id,
            payer: payer_addr,
            total_amount,
            num_installments,
            frequency,
            timestamp: now,
        });
    }

    /// Make an installment payment
    public entry fun pay_installment_apt(
        payer: &signer,
        plan_id: u64,
        payee: address,
    ) acquires PaymentRegistry {
        pay_installment_internal<AptosCoin>(payer, plan_id, payee);
    }

    public entry fun pay_installment_usdc(
        payer: &signer,
        plan_id: u64,
        payee: address,
    ) acquires PaymentRegistry {
        pay_installment_internal<USDC>(payer, plan_id, payee);
    }

    public entry fun pay_installment_usdt(
        payer: &signer,
        plan_id: u64,
        payee: address,
    ) acquires PaymentRegistry {
        pay_installment_internal<USDT>(payer, plan_id, payee);
    }

    fun pay_installment_internal<CoinType>(
        payer: &signer,
        plan_id: u64,
        payee: address,
    ) acquires PaymentRegistry {
        let payer_addr = signer::address_of(payer);
        assert!(exists<PaymentRegistry>(payer_addr), E_NOT_INITIALIZED);
        
        let registry = borrow_global_mut<PaymentRegistry>(payer_addr);
        assert!(table::contains(&registry.installment_plans, plan_id), E_INSTALLMENT_NOT_FOUND);
        
        let plan = table::borrow_mut(&mut registry.installment_plans, plan_id);
        assert!(!plan.completed, E_PAYMENT_ALREADY_MADE);
        assert!(plan.payments_made < plan.num_installments, E_PAYMENT_ALREADY_MADE);

        let amount = plan.installment_amount;
        
        // Validate balance
        assert!(coin::is_account_registered<CoinType>(payer_addr), E_COIN_NOT_REGISTERED);
        let balance = coin::balance<CoinType>(payer_addr);
        assert!(balance >= amount, E_INSUFFICIENT_BALANCE);

        // Transfer
        coin::transfer<CoinType>(payer, payee, amount);

        // Update plan
        plan.payments_made = plan.payments_made + 1;
        if (plan.payments_made >= plan.num_installments) {
            plan.completed = true;
        } else {
            let seconds_per_month = 30 * 24 * 60 * 60;
            plan.next_payment_due = plan.next_payment_due + ((plan.frequency as u64) * seconds_per_month);
        };

        // Issue receipt
        issue_receipt(payer_addr, payee, amount, plan.token_type, string::utf8(b"installment"), plan_id);

        event::emit(InstallmentPaymentMade {
            plan_id,
            payer: payer_addr,
            payment_number: plan.payments_made,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Issue a payment receipt/invoice
    fun issue_receipt(
        payer: address,
        payee: address,
        amount: u64,
        token_type: u8,
        payment_type: String,
        reference_id: u64,
    ) acquires PaymentRegistry {
        if (!exists<PaymentRegistry>(payer)) {
            return
        };

        let registry = borrow_global_mut<PaymentRegistry>(payer);
        let receipt_id = registry.next_receipt_id;
        registry.next_receipt_id = receipt_id + 1;

        let receipt = PaymentReceipt {
            receipt_id,
            payer,
            payee,
            amount,
            token_type,
            payment_type,
            reference_id,
            timestamp: timestamp::now_seconds(),
            notes: string::utf8(b""),
        };

        table::add(&mut registry.receipts, receipt_id, receipt);

        event::emit(ReceiptIssued {
            receipt_id,
            payer,
            payee,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Create an escrow for disputed payments
    public entry fun create_escrow_apt(
        payer: &signer,
        payee: address,
        amount: u64,
        dispute_reason: String,
    ) acquires PaymentRegistry {
        create_escrow_internal<AptosCoin>(payer, payee, amount, TOKEN_APT, dispute_reason);
    }

    public entry fun create_escrow_usdc(
        payer: &signer,
        payee: address,
        amount: u64,
        dispute_reason: String,
    ) acquires PaymentRegistry {
        create_escrow_internal<USDC>(payer, payee, amount, TOKEN_USDC, dispute_reason);
    }

    public entry fun create_escrow_usdt(
        payer: &signer,
        payee: address,
        amount: u64,
        dispute_reason: String,
    ) acquires PaymentRegistry {
        create_escrow_internal<USDT>(payer, payee, amount, TOKEN_USDT, dispute_reason);
    }

    fun create_escrow_internal<CoinType>(
        payer: &signer,
        payee: address,
        amount: u64,
        token_type: u8,
        dispute_reason: String,
    ) acquires PaymentRegistry {
        let payer_addr = signer::address_of(payer);
        
        if (!exists<PaymentRegistry>(payer_addr)) {
            initialize(payer);
        };

        // Validate balance
        assert!(coin::is_account_registered<CoinType>(payer_addr), E_COIN_NOT_REGISTERED);
        let balance = coin::balance<CoinType>(payer_addr);
        assert!(balance >= amount, E_INSUFFICIENT_BALANCE);

        let registry = borrow_global_mut<PaymentRegistry>(payer_addr);
        let escrow_id = registry.next_escrow_id;
        registry.next_escrow_id = escrow_id + 1;

        // In a real implementation, funds would be transferred to an escrow account
        // For this demo, we just record the escrow

        let escrow = PaymentEscrow {
            escrow_id,
            payer: payer_addr,
            payee,
            amount,
            token_type,
            status: ESCROW_DISPUTED,
            created_at: timestamp::now_seconds(),
            dispute_reason,
            resolution_notes: string::utf8(b""),
        };

        table::add(&mut registry.escrows, escrow_id, escrow);

        event::emit(EscrowCreated {
            escrow_id,
            payer: payer_addr,
            payee,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Resolve an escrow (release to payee or refund to payer)
    public entry fun resolve_escrow(
        admin: &signer,
        payer: address,
        escrow_id: u64,
        release_to_payee: bool,
        resolution_notes: String,
    ) acquires PaymentRegistry {
        let admin_addr = signer::address_of(admin);
        assert!(exists<PaymentRegistry>(payer), E_NOT_INITIALIZED);
        
        let registry = borrow_global_mut<PaymentRegistry>(payer);
        assert!(table::contains(&registry.escrows, escrow_id), E_ESCROW_NOT_FOUND);
        
        let escrow = table::borrow_mut(&mut registry.escrows, escrow_id);
        assert!(escrow.status == ESCROW_DISPUTED, E_DISPUTE_ALREADY_RESOLVED);

        // Update escrow status
        escrow.status = if (release_to_payee) { ESCROW_RELEASED } else { ESCROW_REFUNDED };
        escrow.resolution_notes = resolution_notes;

        event::emit(EscrowResolved {
            escrow_id,
            status: escrow.status,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Convert USD amount to token amount using price feed
    public fun usd_to_token_amount(
        admin: address,
        usd_cents: u64,
        token_type: u8,
    ): u64 acquires PriceFeed {
        assert!(exists<PriceFeed>(admin), E_INVALID_PRICE_FEED);
        let feed = borrow_global<PriceFeed>(admin);

        if (token_type == TOKEN_APT) {
            // Convert USD to APT: (usd_cents * 100_000_000) / apt_to_usd
            (usd_cents * 100_000_000) / feed.apt_to_usd
        } else if (token_type == TOKEN_USDC) {
            // Convert USD to USDC: (usd_cents * 1_000_000) / usdc_to_usd
            (usd_cents * 1_000_000) / feed.usdc_to_usd
        } else if (token_type == TOKEN_USDT) {
            // Convert USD to USDT: (usd_cents * 1_000_000) / usdt_to_usd
            (usd_cents * 1_000_000) / feed.usdt_to_usd
        } else {
            0
        }
    }

    // ===== View Functions =====

    #[view]
    public fun get_installment_plan(payer: address, plan_id: u64): (bool, u64, u64, u64, u64, bool) acquires PaymentRegistry {
        if (!exists<PaymentRegistry>(payer)) {
            return (false, 0, 0, 0, 0, false)
        };
        
        let registry = borrow_global<PaymentRegistry>(payer);
        if (!table::contains(&registry.installment_plans, plan_id)) {
            return (false, 0, 0, 0, 0, false)
        };

        let plan = table::borrow(&registry.installment_plans, plan_id);
        (true, plan.total_amount, plan.num_installments, plan.installment_amount, plan.payments_made, plan.completed)
    }

    #[view]
    public fun get_receipt(payer: address, receipt_id: u64): (bool, address, address, u64, u64) acquires PaymentRegistry {
        if (!exists<PaymentRegistry>(payer)) {
            return (false, @0x0, @0x0, 0, 0)
        };
        
        let registry = borrow_global<PaymentRegistry>(payer);
        if (!table::contains(&registry.receipts, receipt_id)) {
            return (false, @0x0, @0x0, 0, 0)
        };

        let receipt = table::borrow(&registry.receipts, receipt_id);
        (true, receipt.payer, receipt.payee, receipt.amount, receipt.timestamp)
    }

    #[view]
    public fun get_escrow_status(payer: address, escrow_id: u64): (bool, u8, u64) acquires PaymentRegistry {
        if (!exists<PaymentRegistry>(payer)) {
            return (false, 0, 0)
        };
        
        let registry = borrow_global<PaymentRegistry>(payer);
        if (!table::contains(&registry.escrows, escrow_id)) {
            return (false, 0, 0)
        };

        let escrow = table::borrow(&registry.escrows, escrow_id);
        (true, escrow.status, escrow.amount)
    }

    #[view]
    public fun get_price_feed(admin: address): (bool, u64, u64, u64, u64) acquires PriceFeed {
        if (!exists<PriceFeed>(admin)) {
            return (false, 0, 0, 0, 0)
        };
        
        let feed = borrow_global<PriceFeed>(admin);
        (true, feed.apt_to_usd, feed.usdc_to_usd, feed.usdt_to_usd, feed.last_updated)
    }
}
