param(
    [switch]$SkipDocker,
    [switch]$SkipDatabase
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $repoRoot
try {
    if (-not (Get-Command 'npm.cmd' -ErrorAction SilentlyContinue)) {
        throw "Required command 'npm.cmd' is not available on PATH."
    }
    if (-not $SkipDocker -and -not (Get-Command 'docker' -ErrorAction SilentlyContinue)) {
        throw "Required command 'docker' is not available on PATH."
    }
    if (-not $SkipDocker) {
        $requiredEnvironment = @('POSTGRES_PASSWORD', 'DATABASE_URL', 'ADMIN_EMAIL', 'ADMIN_PASSWORD', 'FRONTEND_ORIGIN', 'JWT_SECRET')
        $missingEnvironment = $requiredEnvironment | Where-Object { [string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($_)) }
        if ($missingEnvironment) { throw "Required production environment variables are missing: $($missingEnvironment -join ', ')" }
        if (-not $env:DATABASE_URL.StartsWith('postgresql://')) { throw 'DATABASE_URL must use PostgreSQL.' }
        if (-not $env:FRONTEND_ORIGIN.StartsWith('https://')) { throw 'FRONTEND_ORIGIN must use HTTPS.' }
        if ($env:JWT_SECRET.Length -lt 64) { throw 'JWT_SECRET must contain at least 64 characters.' }
        & docker compose -f docker-compose.production.yml config --quiet
        if ($LASTEXITCODE -ne 0) { throw 'Production Compose configuration validation failed.' }
    }
    & npm.cmd audit --omit=dev --audit-level=high
    if ($LASTEXITCODE -ne 0) { throw 'Production dependency audit failed.' }
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Test suite failed.' }
    & npm.cmd run typecheck
    if ($LASTEXITCODE -ne 0) { throw 'TypeScript validation failed.' }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Production build failed.' }
    if (-not $SkipDocker) {
        & docker compose -f docker-compose.production.yml build
        if ($LASTEXITCODE -ne 0) { throw 'Production container build failed.' }
    }
    Write-Host 'Release checks completed successfully.'
} finally {
    Pop-Location
}

