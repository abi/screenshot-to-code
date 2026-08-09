#!/usr/bin/env bash
# Starts the backend (FastAPI, :7001) and frontend (Vite, :5173) dev servers
# together. Press Ctrl+C to stop both.
#
# Usage:
#   ./scripts/dev.sh
set -euo pipefail
cd "$(dirname "$0")/.."

pids=()

cleanup() {
  echo ""
  echo "Stopping dev servers..."
  for pid in "${pids[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Starting backend on http://127.0.0.1:7001 ..."
(cd backend && poetry run uvicorn main:app --reload --port 7001) &
pids+=($!)

echo "Starting frontend on http://localhost:5173 ..."
(cd frontend && pnpm dev) &
pids+=($!)

wait
