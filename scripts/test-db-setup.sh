#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
pnpm db:up
bash ./scripts/test-db-reset.sh
DATABASE_URL="postgres://locallama:locallama@127.0.0.1:5432/locallama_test" pnpm db:push
