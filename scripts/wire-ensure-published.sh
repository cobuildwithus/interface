#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash apps/web/scripts/wire-ensure-published.sh
bash apps/contracts/scripts/wire-ensure-published.sh
