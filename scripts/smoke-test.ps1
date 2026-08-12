param(
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$AdminEmail = $env:ADMIN_EMAIL,
    [string]$AdminPassword = $env:ADMIN_PASSWORD,
    [switch]$RequireAuthentication
)

$ErrorActionPreference = 'Stop'
$base = $BaseUrl.TrimEnd('/')

function Assert-HttpOk([string]$Path) {
    $response = Invoke-WebRequest -Uri "$base$Path" -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$Path returned $($response.StatusCode)" }
    Write-Host "PASS $Path ($($response.StatusCode))"
}

function Assert-JsonHealth([string]$Path, [string]$ExpectedStatus) {
    $response = Invoke-WebRequest -Uri "$base$Path" -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) { throw "$Path returned $($response.StatusCode)" }
    $contentType = [string]$response.Headers['Content-Type']
    if (-not $contentType.StartsWith('application/json', [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "$Path returned '$contentType' instead of application/json"
    }
    try { $body = $response.Content | ConvertFrom-Json } catch { throw "$Path did not return valid JSON" }
    if ($body.status -ne $ExpectedStatus) { throw "$Path returned status '$($body.status)' instead of '$ExpectedStatus'" }
    Write-Host "PASS $Path ($($response.StatusCode), status=$ExpectedStatus)"
}

Assert-HttpOk '/healthz'
Assert-JsonHealth '/health/live' 'ok'
Assert-JsonHealth '/health/ready' 'ready'
Assert-HttpOk '/'

if (($AdminEmail -and -not $AdminPassword) -or ($AdminPassword -and -not $AdminEmail)) {
    throw 'ADMIN_EMAIL and ADMIN_PASSWORD must be supplied together.'
}
if ($RequireAuthentication -and (-not $AdminEmail -or -not $AdminPassword)) {
    throw 'Authenticated smoke testing is required, but ADMIN_EMAIL or ADMIN_PASSWORD is missing.'
}
if ($AdminEmail -and $AdminPassword) {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $payload = @{ email = $AdminEmail; password = $AdminPassword } | ConvertTo-Json
    $login = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $payload -WebSession $session -TimeoutSec 15
    if (-not $login.user -or $login.user.role -ne 'ADMINISTRATOR') { throw 'Administrator authentication smoke test failed.' }
    $me = Invoke-RestMethod -Uri "$base/api/auth/me" -WebSession $session -TimeoutSec 15
    if ($me.user.id -ne $login.user.id) { throw 'Persistent session smoke test failed.' }
    Write-Host 'PASS administrator login and persistent session'
} else {
    Write-Warning 'ADMIN_EMAIL or ADMIN_PASSWORD not set; authenticated smoke test skipped.'
}

Write-Host 'SMART Oil Field production smoke test completed.'

