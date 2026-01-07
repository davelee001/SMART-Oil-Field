# Oil Tracker - Aptos Move Module

Blockchain-based oil movement tracking for immutable, verifiable supply chain records.

## Features

- ✅ **On-chain batch creation** - Immutable record of oil batches
- ✅ **Lifecycle tracking** - 7 stages from drilling to delivery
- ✅ **Event logging** - Timestamped events with facility and notes
- ✅ **Ownership transfer** - Transfer batches between parties
- ✅ **View functions** - Query batch status without transactions
- ✅ **Event emissions** - Listen for BatchCreated, EventAdded, BatchTransferred

## Lifecycle Stages

| Stage | ID | Description |
|-------|----|-----------| 
| DRILLING | 0 | Initial extraction |
| EXTRACTION | 1 | Oil extraction phase |
| STORAGE | 2 | Temporary storage |
| TRANSPORT | 3 | In transit |
| REFINING | 4 | Refinery processing |
| DISTRIBUTION | 5 | Distribution to customers |
| DELIVERED | 6 | Final delivery |

## Deployment

### Prerequisites

- Install [Aptos CLI](https://aptos.dev/tools/aptos-cli/install-cli/)
- Initialize an Aptos account with test tokens

### Compile

```bash
cd blockchain/move/oil_tracker
aptos move compile
```

### Publish

```powershell
.\scripts\publish.ps1
```

Or manually:

```bash
# Devnet (for testing)
aptos move publish --network devnet

# Testnet
aptos move publish --network testnet

# Mainnet (requires real APT)
aptos move publish --network mainnet
```

## Usage

### 1. Initialize Registry

```bash
aptos move run \
  --function-id YOUR_ADDRESS::tracker::initialize \
  --network devnet
```

### 2. Create Oil Batch

```bash
aptos move run \
  --function-id YOUR_ADDRESS::tracker::create_batch \
  --args string:BATCH-001 string:well-001 u64:1000000 string:bbl \
  --network devnet
```

Parameters:
- `batch_id`: Unique identifier (e.g., "BATCH-001")
- `origin`: Well or site name (e.g., "well-001")
- `volume`: Volume in smallest units (e.g., 1000000 = 1000.000 barrels)
- `unit`: Unit type (e.g., "bbl", "L", "gal")

### 3. Add Lifecycle Event

```bash
aptos move run \
  --function-id YOUR_ADDRESS::tracker::add_event \
  --args \
    string:BATCH-001 \
    u64:2 \
    string:IN_PROGRESS \
    string:Terminal-A \
    string:'Loaded onto tanker' \
  --network devnet
```

Parameters:
- `batch_id`: Batch identifier
- `stage`: Stage ID (0-6, see table above)
- `status`: Status string (e.g., "IN_PROGRESS", "COMPLETED")
- `facility`: Facility name
- `notes`: Additional notes

### 4. Transfer Ownership

```bash
aptos move run \
  --function-id YOUR_ADDRESS::tracker::transfer_batch \
  --args string:BATCH-001 address:0x123... \
  --network devnet
```

### 5. Query Batch (View Functions)

```bash
# Get current stage
aptos move view \
  --function-id YOUR_ADDRESS::tracker::get_batch_stage \
  --args address:OWNER_ADDR string:BATCH-001 \
  --network devnet

# Get batch owner
aptos move view \
  --function-id YOUR_ADDRESS::tracker::get_batch_owner \
  --args address:OWNER_ADDR string:BATCH-001 \
  --network devnet

# Get event count
aptos move view \
  --function-id YOUR_ADDRESS::tracker::get_event_count \
  --args address:OWNER_ADDR string:BATCH-001 \
  --network devnet

# Check if batch exists
aptos move view \
  --function-id YOUR_ADDRESS::tracker::batch_exists \
  --args address:OWNER_ADDR string:BATCH-001 \
  --network devnet
```

## Integration with Python API

The blockchain module can work alongside the existing Python API:

- **Python API**: Fast queries, analytics, CSV export
- **Blockchain**: Immutable proof, ownership tracking, auditability

### Hybrid Approach

1. Create batch in Python API (fast, flexible)
2. Register on blockchain for immutability
3. Query from Python for analytics
4. Verify critical events on blockchain

## Events

The module emits three event types:

### BatchCreated
```move
{
    batch_id: String,
    origin: String,
    volume: u64,
    owner: address,
    timestamp: u64,
}
```

### EventAdded
```move
{
    batch_id: String,
    stage: u64,
    status: String,
    facility: String,
    timestamp: u64,
}
```

### BatchTransferred
```move
{
    batch_id: String,
    from: address,
    to: address,
    timestamp: u64,
}
```

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| 1 | E_BATCH_ALREADY_EXISTS | Batch ID already registered |
| 2 | E_BATCH_NOT_FOUND | Batch doesn't exist |
| 3 | E_UNAUTHORIZED | Caller is not batch owner |
| 4 | E_INVALID_STAGE | Stage number out of range |

## Security

- ✅ Only batch owner can add events
- ✅ Only batch owner can transfer ownership
- ✅ Timestamps use blockchain time (tamper-proof)
- ✅ All data immutable once written

## Example Workflow

```bash
# 1. Initialize
aptos move run --function-id ADDR::tracker::initialize --network devnet

# 2. Create batch at drilling site
aptos move run --function-id ADDR::tracker::create_batch \
  --args string:BATCH-20260108-001 string:WellSite-42 u64:5000000 string:bbl

# 3. Extraction complete
aptos move run --function-id ADDR::tracker::add_event \
  --args string:BATCH-20260108-001 u64:1 string:COMPLETED string:WellSite-42 string:'Extraction complete'

# 4. Moved to storage
aptos move run --function-id ADDR::tracker::add_event \
  --args string:BATCH-20260108-001 u64:2 string:IN_PROGRESS string:Storage-Tank-7 string:'Stored'

# 5. Loaded for transport
aptos move run --function-id ADDR::tracker::add_event \
  --args string:BATCH-20260108-001 u64:3 string:IN_TRANSIT string:Tanker-Ship string:'Shipped to refinery'

# 6. Transfer to refinery owner
aptos move run --function-id ADDR::tracker::transfer_batch \
  --args string:BATCH-20260108-001 address:0xREFINERY_ADDR
```

## Cost Estimation

Approximate gas costs on Aptos (devnet/testnet):

- **Initialize**: ~0.001 APT
- **Create batch**: ~0.002 APT
- **Add event**: ~0.001 APT
- **Transfer**: ~0.001 APT
- **View functions**: Free (read-only)

## License

Part of the SMART Oil Field project.
