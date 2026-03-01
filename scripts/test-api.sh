#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"
bash ./scripts/test-db-setup.sh
TEST_DATABASE_URL="postgres://locallama:locallama@127.0.0.1:5432/locallama_test" pnpm --filter @locallama/api test
