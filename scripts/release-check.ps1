param(
    [switch]$SkipDocker,
    [switch]$SkipDatabase
)

$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
Push-Location $repoRoot
try {
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

