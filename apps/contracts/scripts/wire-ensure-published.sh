#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$PACKAGE_ROOT/../.." && pwd)"

cd "$PACKAGE_ROOT"

pnpm exec wire-ensure-published \
  --package-dir "$PACKAGE_ROOT" \
  --install-root "$REPO_ROOT"
