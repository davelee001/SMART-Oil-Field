param(
  [string]$profile = "default",
  [string]$network = "testnet",
  [string]$addr = "0xA11CE5"
)

Write-Host "== SMART Oilfield: Move Subscriptions Publish ==" -ForegroundColor Cyan

function Require-AptosCli {
  $aptos = Get-Command aptos -ErrorAction SilentlyContinue
  if (-not $aptos) {
    Write-Host "Aptos CLI not found. Install from: https://aptos.dev/en/build/cli/" -ForegroundColor Yellow
    exit 1
  }
}

Require-AptosCli

Write-Host "Running unit tests..." -ForegroundColor Cyan
aptos move test --package-dir . --named-addresses subscriptions=$addr
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Compiling package..." -ForegroundColor Cyan
aptos move compile --package-dir . --named-addresses subscriptions=$addr --network $network
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Publishing to $network with profile '$profile'..." -ForegroundColor Cyan
aptos move publish --package-dir . --named-addresses subscriptions=$addr --profile $profile --assume-yes
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done. Verify on explorer or via 'aptos account resources --profile $profile'" -ForegroundColor Green
