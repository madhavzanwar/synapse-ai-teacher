@echo off
TITLE Synapse AI Teacher - Full Stack Launcher
echo ======================================================================
echo             SYNAPSE AI TEACHER — LAUNCHING FULL STACK
echo ======================================================================
echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Synapse Backend (FastAPI)" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "Synapse Frontend (Next.js)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ======================================================================
echo  All services started!
echo  Frontend UI : http://localhost:3000
echo  Backend API : http://localhost:8000
echo  API Docs    : http://localhost:8000/docs
echo ======================================================================
pause
