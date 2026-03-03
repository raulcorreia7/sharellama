#!/usr/bin/env bash
# start-all.sh - Start entire application stack
#
# Usage: ./scripts/start-all.sh
#
# Starts PostgreSQL, waits for readiness, then launches API and UI servers.

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting entire stack..."

# Start database first
echo "  Starting PostgreSQL..."
docker compose up -d --wait
echo "  ✓ PostgreSQL ready"

# Start API and UI servers (in background)
echo "  Starting API server (port 8787)..."
pnpm run dev:api &
API_PID=$!

echo "  Starting UI server (port 3000)..."
pnpm run dev:ui &
UI_PID=$!

echo ""
echo "Stack started:"
echo "  - PostgreSQL: running"
echo "  - API server: http://localhost:8787 (PID: $API_PID)"
echo "  - UI server:  http://localhost:3000 (PID: $UI_PID)"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes
wait
