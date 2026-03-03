#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
docker compose exec -T db psql -U locallama -d locallama_test -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
