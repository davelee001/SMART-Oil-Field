
param(
  [string]$Remote = "",
  [string]$Branch = "main",
  [switch]$Push
)

$ErrorActionPreference = 'Stop'

function Ensure-Git {
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git is not installed or not on PATH."
  }
}

function Ensure-Repo {
  if (-not (Test-Path ".git")) {
    git init | Out-Null
  }
}

function Ensure-Branch {
  $current = git branch --show-current
  if (-not $current) {
    git checkout -b $Branch | Out-Null
  } else {
    git checkout -B $Branch | Out-Null
  }
}

function Commit-Group {
  param(
    [string[]]$Paths,
    [string]$Message
  )
  # Stage only paths that exist
  $existing = $Paths | Where-Object { Test-Path $_ }
  if (-not $existing) { return }
  git add -- $existing
  # If nothing new staged, skip commit
  $hasStagedChanges = $true
  try {
    git diff --staged --quiet
    if ($LASTEXITCODE -eq 0) { $hasStagedChanges = $false } else { $hasStagedChanges = $true }
  } catch { $hasStagedChanges = $true }
  if ($hasStagedChanges) {
    git commit -m $Message | Out-Null
    Write-Host "Committed: $Message" -ForegroundColor Green
  } else {
    Write-Host "No changes to commit for: $Message" -ForegroundColor Yellow
  }
}

try {
  Ensure-Git
  Ensure-Repo
  Ensure-Branch

  # A) API: Oil movement tracker tables + endpoints
  Commit-Group -Paths @(
    "src/python_api/app/main.py"
  ) -Message "feat(api): add oil movement tracker tables and endpoints"

  # B) Frontend: Tracker UI + client actions
  Commit-Group -Paths @(
    "src/frontend/index.html",
    "src/frontend/app.js"
  ) -Message "feat(frontend): add oil movement tracker UI and actions"

  # C) TS Gateway: proxy routes for tracker
  Commit-Group -Paths @(
    "src/ts_backend/src/index.ts"
  ) -Message "feat(ts-gateway): proxy oil tracker routes"

  # D) Seed: demo batch and events
  Commit-Group -Paths @(
    "src/python_api/app/seed.py"
  ) -Message "chore(seed): add demo oil batch and events"

  # E) Tests: oil tracker happy-path test
  Commit-Group -Paths @(
    "src/python_api/app/test_oil_tracker.py"
  ) -Message "test(api): add oil movement tracker test"

  # F) Docs: feature guide
  Commit-Group -Paths @(
    "docs/OIL_MOVEMENT_TRACKER.md"
  ) -Message "docs: add oil movement tracker guide"

  git status -sb

  if ($Push) {
    if ($Remote) {
      if (git remote | Select-String -Quiet "^origin$") {
        git remote set-url origin $Remote | Out-Null
      } else {
        git remote add origin $Remote | Out-Null
      }
    }
    # If origin exists, attempt rebase and push
    $hasOrigin = $false
    try { git ls-remote origin | Out-Null; $hasOrigin = $true } catch { $hasOrigin = $false }
    if ($hasOrigin) {
      try { git pull --rebase origin $Branch } catch { Write-Host "No remote branch to rebase; continuing." -ForegroundColor Yellow }
      git push -u origin $Branch
    } else {
      if ($Remote) {
        git push -u origin $Branch
      } else {
        Write-Host "Remote 'origin' is not configured. Provide -Remote <url> to push." -ForegroundColor Yellow
      }
    }
  }

} catch {
  Write-Error $_
  exit 1
}
