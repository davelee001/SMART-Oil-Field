param(
  [switch]
)
if (-not ) {
  if (-not (Test-Path ".venv")) { python -m venv .venv }
  .\.venv\Scripts\Activate.ps1
  pip install -U pip
  pip install -r requirements.txt
}
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
