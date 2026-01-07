# PowerShell script to publish the Oil Tracker Move module

Write-Host "🛢️  Publishing Oil Tracker Move Module..." -ForegroundColor Cyan
Write-Host ""

# Check if aptos CLI is installed
if (!(Get-Command aptos -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Aptos CLI not found!" -ForegroundColor Red
    Write-Host "Install from: https://aptos.dev/tools/aptos-cli/install-cli/" -ForegroundColor Yellow
    exit 1
}

# Compile the module
Write-Host "📦 Compiling Move module..." -ForegroundColor Yellow
aptos move compile

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Compilation failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Compilation successful!" -ForegroundColor Green
Write-Host ""

# Prompt for deployment
Write-Host "Ready to deploy to blockchain. Options:" -ForegroundColor Cyan
Write-Host "  1. Test on Devnet (recommended for testing)" -ForegroundColor White
Write-Host "  2. Deploy to Testnet" -ForegroundColor White
Write-Host "  3. Deploy to Mainnet (requires APT tokens)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-3) or 'q' to quit"

if ($choice -eq 'q') {
    Write-Host "Deployment cancelled." -ForegroundColor Yellow
    exit 0
}

$network = switch ($choice) {
    '1' { 'devnet' }
    '2' { 'testnet' }
    '3' { 'mainnet' }
    default { 
        Write-Host "Invalid choice!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "🚀 Publishing to $network..." -ForegroundColor Cyan
Write-Host ""

# Publish the module
aptos move publish --network $network

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Oil Tracker module published successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Initialize the registry:" -ForegroundColor White
    Write-Host "     aptos move run --function-id [YOUR_ADDR]::tracker::initialize --network $network" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Create a batch:" -ForegroundColor White
    Write-Host "     aptos move run --function-id [YOUR_ADDR]::tracker::create_batch \" -ForegroundColor Gray
    Write-Host "       --args string:BATCH-001 string:well-001 u64:1000000 string:bbl \" -ForegroundColor Gray
    Write-Host "       --network $network" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Add events:" -ForegroundColor White
    Write-Host "     aptos move run --function-id [YOUR_ADDR]::tracker::add_event \" -ForegroundColor Gray
    Write-Host "       --args string:BATCH-001 u64:1 string:IN_PROGRESS string:Terminal-A string:'Loaded for transport' \" -ForegroundColor Gray
    Write-Host "       --network $network" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check your account balance and network connection." -ForegroundColor Yellow
    exit 1
}
