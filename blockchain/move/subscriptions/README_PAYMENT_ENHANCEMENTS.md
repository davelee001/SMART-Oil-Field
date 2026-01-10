# Payment Enhancements Module

This module provides comprehensive payment enhancements for the subscription system, including multi-token support, installment payments, stablecoin pricing, payment receipts/invoices, and escrow for disputed payments.

## Features Implemented

### 1. Multi-Token Support (USDC, USDT, APT)
- Support for multiple payment tokens: APT, USDC, USDT
- Generic payment functions that work with any supported coin type
- Easy to extend with additional tokens

**Functions:**
- `make_payment_apt(payer, payee, amount)` - Pay with APT
- `make_payment_usdc(payer, payee, amount)` - Pay with USDC
- `make_payment_usdt(payer, payee, amount)` - Pay with USDT

### 2. Installment Payments (Monthly vs Annually)
- Create flexible installment plans with configurable:
  - Total amount
  - Number of installments (up to 24)
  - Payment frequency (monthly, quarterly, annually)
  - Token type for payment
- Track payment progress automatically
- Auto-calculate next payment due date

**Functions:**
- `create_installment_plan(payer, total_amount, num_installments, frequency, token_type)`
- `pay_installment_apt(payer, plan_id, payee)`
- `pay_installment_usdc(payer, plan_id, payee)`
- `pay_installment_usdt(payer, plan_id, payee)`

**Frequency Options:**
- `FREQUENCY_MONTHLY = 1` - Pay every month
- `FREQUENCY_QUARTERLY = 3` - Pay every 3 months
- `FREQUENCY_ANNUALLY = 12` - Pay once per year

### 3. Stablecoin Pricing to Avoid Volatility
- Price feed system to convert USD amounts to token amounts
- Support for APT, USDC, and USDT conversions
- Oracle-ready design (currently uses simple admin updates)
- Prices stored in USD cents for precision

**Functions:**
- `update_price_feed(admin, apt_to_usd, usdc_to_usd, usdt_to_usd)` - Update prices
- `usd_to_token_amount(admin, usd_cents, token_type)` - Convert USD to tokens

**Price Feed:**
- APT price in USD cents (e.g., 1000 = $10.00)
- USDC price in USD cents (typically 100 = $1.00)
- USDT price in USD cents (typically 100 = $1.00)
- Last updated timestamp

### 4. Payment Receipts/Invoices
- Automatic receipt generation for all payments
- Unique receipt IDs for tracking
- Complete payment history stored on-chain
- Includes payer, payee, amount, token type, timestamp, and notes

**Receipt Information:**
- Receipt ID (unique)
- Payer address
- Payee address
- Amount paid
- Token type used
- Payment type (direct, installment, etc.)
- Reference ID (links to plan or subscription)
- Timestamp
- Optional notes

**View Function:**
- `get_receipt(payer, receipt_id)` - Retrieve receipt details

### 5. Escrow for Disputed Payments
- Hold payments in escrow for dispute resolution
- Track dispute reasons and resolution notes
- Support for release to payee or refund to payer
- Multiple escrow statuses: Pending, Released, Refunded, Disputed

**Functions:**
- `create_escrow_apt(payer, payee, amount, dispute_reason)`
- `create_escrow_usdc(payer, payee, amount, dispute_reason)`
- `create_escrow_usdt(payer, payee, amount, dispute_reason)`
- `resolve_escrow(admin, payer, escrow_id, release_to_payee, resolution_notes)`

**Escrow Statuses:**
- `ESCROW_PENDING = 0` - Initial state
- `ESCROW_RELEASED = 1` - Funds released to payee
- `ESCROW_REFUNDED = 2` - Funds refunded to payer
- `ESCROW_DISPUTED = 3` - Under dispute

## Usage Examples

### Initialize the Payment System
```move
// Initialize for an account
payment_enhancements::initialize(account);
```

### Make a Multi-Token Payment
```move
// Pay with APT
payment_enhancements::make_payment_apt(payer, payee_address, 1_000_000);

// Pay with USDC
payment_enhancements::make_payment_usdc(payer, payee_address, 10_000_000);

// Pay with USDT
payment_enhancements::make_payment_usdt(payer, payee_address, 10_000_000);
```

### Create and Pay Installment Plan
```move
// Create a 12-month installment plan for $120 (12 payments of $10)
// Frequency: 1 = monthly, Token: 1 = USDC
payment_enhancements::create_installment_plan(
    payer,
    12_000_000,  // $120 in USDC (6 decimals)
    12,          // 12 installments
    1,           // Monthly frequency
    1            // USDC token
);

// Make the first installment payment
payment_enhancements::pay_installment_usdc(payer, plan_id, payee_address);
```

### Update Price Feed (Stablecoin Pricing)
```move
// Update prices (admin only)
// APT = $10.00, USDC = $1.00, USDT = $1.00
payment_enhancements::update_price_feed(
    admin,
    1000,  // APT price in cents
    100,   // USDC price in cents
    100    // USDT price in cents
);

// Convert $50 to APT tokens
let apt_amount = payment_enhancements::usd_to_token_amount(
    admin_address,
    5000,  // $50.00 in cents
    0      // TOKEN_APT
);
```

### Create and Resolve Escrow
```move
// Create escrow for disputed payment
payment_enhancements::create_escrow_usdc(
    payer,
    payee_address,
    10_000_000,  // $10 in USDC
    string::utf8(b"Service not delivered as promised")
);

// Resolve escrow (admin/arbiter decision)
// Release to payee
payment_enhancements::resolve_escrow(
    admin,
    payer_address,
    escrow_id,
    true,  // release_to_payee = true
    string::utf8(b"Service was delivered, releasing payment")
);

// Or refund to payer
payment_enhancements::resolve_escrow(
    admin,
    payer_address,
    escrow_id,
    false,  // release_to_payee = false
    string::utf8(b"Service not delivered, refunding payer")
);
```

### Query Information
```move
// Get installment plan status
let (exists, total, num_installments, installment_amt, payments_made, completed) = 
    payment_enhancements::get_installment_plan(payer_address, plan_id);

// Get receipt details
let (exists, payer, payee, amount, timestamp) = 
    payment_enhancements::get_receipt(payer_address, receipt_id);

// Get escrow status
let (exists, status, amount) = 
    payment_enhancements::get_escrow_status(payer_address, escrow_id);

// Get price feed
let (exists, apt_price, usdc_price, usdt_price, last_updated) = 
    payment_enhancements::get_price_feed(admin_address);
```

## Events Emitted

All operations emit events for tracking:

- `MultiTokenPaymentMade` - When a direct payment is made
- `InstallmentPlanCreated` - When a new installment plan is created
- `InstallmentPaymentMade` - When an installment payment is made
- `ReceiptIssued` - When a payment receipt is generated
- `EscrowCreated` - When an escrow is created
- `EscrowResolved` - When an escrow dispute is resolved
- `PriceFeedUpdated` - When prices are updated

## Integration with Subscription Module

This payment module can be integrated with the existing subscription module to:

1. Allow subscribers to pay with USDC/USDT instead of just APT
2. Enable monthly installment plans for annual subscriptions
3. Price subscriptions in USD to avoid APT volatility
4. Generate receipts for all subscription payments
5. Handle disputed subscription payments through escrow

## Token Types Reference

```move
const TOKEN_APT: u8 = 0;   // Aptos Coin
const TOKEN_USDC: u8 = 1;  // USD Coin
const TOKEN_USDT: u8 = 2;  // Tether USD
```

## Security Considerations

1. **Price Oracle**: In production, replace the admin-controlled price feed with a decentralized oracle (e.g., Pyth, Switchboard)
2. **Escrow Funds**: Current implementation tracks escrow state but doesn't hold actual funds. In production, implement proper fund locking
3. **Admin Privileges**: Escrow resolution requires admin signature. Consider multi-sig or DAO governance for production
4. **Token Validation**: Ensure USDC and USDT contracts are properly validated before use

## Future Enhancements

- [ ] Integration with price oracles (Pyth, Switchboard)
- [ ] Multi-signature escrow resolution
- [ ] Subscription auto-renewal with installments
- [ ] Batch payment processing
- [ ] Partial refunds for cancelled subscriptions
- [ ] Discount codes for installment plans
- [ ] Late payment fees and grace periods
- [ ] Cross-chain token support
