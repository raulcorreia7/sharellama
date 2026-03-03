#!/usr/bin/env bash
# kill-all.sh - Force kill all application servers immediately
#
# Usage: ./scripts/kill-all.sh
#
# Immediately kills API server (port 8787), UI server (port 3000),
# and PostgreSQL container with SIGKILL. No graceful shutdown attempt.

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Force killing all servers..."

kill_port() {
	local port=$1
	local name=$2

	pid=$(lsof -ti:"$port" 2>/dev/null || true)

	if [[ -n "$pid" ]]; then
		echo "  Killing $name on port $port (PID: $pid)"
		kill -KILL "$pid" 2>/dev/null || true
	fi
}

# Force kill Node.js servers
kill_port 8787 "API server"
kill_port 3000 "UI server"

# Force stop Docker containers
if docker compose ps --format json 2>/dev/null | grep -q '"db"'; then
	echo "  Killing PostgreSQL container..."
	docker compose down --remove-orphans
fi

echo "All servers killed."
