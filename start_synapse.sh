#!/usr/bin/env bash
# Synapse AI Teacher - Full Stack Launcher for Bash
echo "======================================================================"
echo "            SYNAPSE AI TEACHER — LAUNCHING FULL STACK"
echo "======================================================================"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "[1/2] Starting FastAPI Backend on http://localhost:8000 ..."
(cd "$ROOT_DIR/backend" && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

echo "[2/2] Starting Next.js Frontend on http://localhost:3000 ..."
(cd "$ROOT_DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo "  All services running in background!"
echo "  Frontend UI : http://localhost:3000"
echo "  Backend API : http://localhost:8000"
echo "  API Docs    : http://localhost:8000/docs"
echo "======================================================================"

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
