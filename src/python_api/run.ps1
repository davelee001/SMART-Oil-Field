param(
  [switch]$SkipInstall = $false,
  [string]$Host = "127.0.0.1",
  [int]$Port = 8000
)

function Require-Python {
  $py = Get-Command python -ErrorAction SilentlyContinue
  if (-not $py) {
    Write-Host "Python not found on PATH." -ForegroundColor Red
    exit 1
  }
}

function Ensure-Venv {
  if (-not (Test-Path ".venv")) {
    Write-Host "Creating venv..." -ForegroundColor Cyan
    python -m venv .venv
  }
}

function Install-Dependencies {
  if (-not $SkipInstall) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    & ".\.venv\Scripts\python.exe" -m pip install -U pip
    if (Test-Path "requirements.txt") {
      & ".\.venv\Scripts\python.exe" -m pip install -r requirements.txt
    }
  } else {
    Write-Host "Skipping dependency install." -ForegroundColor Yellow
  }
}

Require-Python
Ensure-Venv
Install-Dependencies

Write-Host "Starting API on $Host:$Port ..." -ForegroundColor Cyan
& ".\.venv\Scripts\python.exe" -m uvicorn app.main:app --host $Host --port $Port --reload
