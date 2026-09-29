# AirAware Backend Launch Script for Windows PowerShell
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  AirAware — Climate Resilience & Clean Air Intelligence" -ForegroundColor Green
Write-Host "  Starting Python 3.12 FastAPI Local Backend" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Check Python installation
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "Error: Python is not detected in your PATH. Please install Python 3.12." -ForegroundColor Red
    Exit 1
}

# 2. Virtual environment setup
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment 'venv'..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# 3. Upgrade pip and install dependencies
Write-Host "Installing requirements from requirements.txt..." -ForegroundColor Yellow
python -m pip install --upgrade pip
pip install -r requirements.txt

# 4. Copy .env if not exists
if (-not (Test-Path ".env")) {
    Copy-Item "..\.env.example" ".env"
    Write-Host "Created .env from .env.example" -ForegroundColor Green
}

# 5. Launch FastAPI backend
Write-Host "`nBackend is starting at http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Interactive Swagger API documentation: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate the server.`n" -ForegroundColor DarkGray

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
