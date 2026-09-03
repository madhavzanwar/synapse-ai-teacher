# Synapse AI Teacher - Full Stack Launcher for PowerShell
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "            SYNAPSE AI TEACHER — LAUNCHING FULL STACK" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[1/2] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir/backend'; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$baseDir/frontend'; npm run dev"

Write-Host "`n======================================================================" -ForegroundColor Green
Write-Host "  All services started!" -ForegroundColor Green
Write-Host "  Frontend UI : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API : http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs    : http://localhost:8000/docs" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Green
