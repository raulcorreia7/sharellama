#!/usr/bin/env bash
# stop-all.sh - Gracefully stop all application servers
#
# Usage: ./scripts/stop-all.sh
#
# Stops API server (port 8787), UI server (port 3000), and PostgreSQL container.
# Sends SIGTERM first, waits up to 5 seconds, then force kills if needed.

set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Stopping all servers gracefully..."

stop_port() {
	local port=$1
	local name=$2

	pid=$(lsof -ti:"$port" 2>/dev/null || true)

	if [[ -n "$pid" ]]; then
		echo "  Stopping $name on port $port (PID: $pid)..."

		# Send SIGTERM for graceful shutdown
		kill -TERM "$pid" 2>/dev/null || true

		# Wait up to 5 seconds (10 checks × 0.5s)
		for i in {1..10}; do
			if ! kill -0 "$pid" 2>/dev/null; then
				echo "    ✓ $name stopped gracefully"
				return 0
			fi
			sleep 0.5
		done

		# Force kill if still running
		if kill -0 "$pid" 2>/dev/null; then
			echo "    ⚠ $name didn't respond, force killing..."
			kill -KILL "$pid" 2>/dev/null || true
			sleep 0.5
		fi

		echo "    ✓ $name terminated"
	fi
}

# Stop Node.js servers
stop_port 8787 "API server"
stop_port 3000 "UI server"

# Stop Docker containers gracefully
if docker compose ps --format json 2>/dev/null | grep -q '"db"'; then
	echo "  Stopping PostgreSQL container..."
	docker compose stop
	echo "  ✓ PostgreSQL stopped"
fi

echo "All servers stopped."
