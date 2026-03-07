#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$PACKAGE_ROOT/../.." && pwd)"

cd "$PACKAGE_ROOT"
source "$REPO_ROOT/scripts/repo-tools.config.sh"

exec "$(cobuild_repo_tool_bin cobuild-switch-package-source)" --package @cobuild/wire --field dependencies --published "$@"
