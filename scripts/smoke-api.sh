#!/usr/bin/env bash
set -euo pipefail

pnpm exec tsx ./scripts/smoke.ts --api
