#!/usr/bin/env bash
set -euo pipefail

COBUILD_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

repo_tools_join_lines() {
  local out_var="$1"
  shift
  local joined=""
  local item
  for item in "$@"; do
    joined+="${item}"$'\n'
  done
  printf -v "$out_var" '%s' "$joined"
  export "$out_var"
}

cobuild_repo_tool_bin() {
  local bin_name="$1"
  local local_bin="$COBUILD_REPO_ROOT/node_modules/.bin/$bin_name"

  if [ -x "$local_bin" ]; then
    printf '%s\n' "$local_bin"
    return 0
  fi

  if command -v "$bin_name" >/dev/null 2>&1; then
    command -v "$bin_name"
    return 0
  fi

  echo "Error: missing repo-tools executable '$bin_name'. Install dependencies first." >&2
  return 1
}

required_files=(
  "agent-docs/index.md"
  "ARCHITECTURE.md"
  "AGENTS.md"
  "agent-docs/PLANS.md"
  "agent-docs/DESIGN.md"
  "agent-docs/FRONTEND.md"
  "agent-docs/PRODUCT_SENSE.md"
  "agent-docs/QUALITY_SCORE.md"
  "agent-docs/RELIABILITY.md"
  "agent-docs/SECURITY.md"
  "agent-docs/cobuild-ui-architecture.md"
  "agent-docs/cobuild-ui-components.md"
  "agent-docs/design-docs/index.md"
  "agent-docs/product-specs/index.md"
  "agent-docs/prompts/simplify.md"
  "agent-docs/prompts/test-coverage-audit.md"
  "agent-docs/prompts/task-finish-review.md"
  "agent-docs/references/README.md"
  "agent-docs/references/module-boundary-map.md"
  "agent-docs/references/app-router-and-data-flow.md"
  "agent-docs/references/auth-wallet-model.md"
  "agent-docs/references/server-data-cache-map.md"
  "agent-docs/references/onchain-execution-map.md"
  "agent-docs/references/testing-ci-map.md"
  "agent-docs/references/nextjs-llms.txt"
  "agent-docs/references/prisma-llms.txt"
  "agent-docs/references/wagmi-llms.txt"
  "agent-docs/generated/README.md"
  "agent-docs/exec-plans/active/README.md"
  "agent-docs/exec-plans/completed/README.md"
  "agent-docs/exec-plans/tech-debt-tracker.md"
)
repo_tools_join_lines COBUILD_DRIFT_REQUIRED_FILES "${required_files[@]}"
export COBUILD_DRIFT_CODE_CHANGE_PATTERN='^(apps/web/(app|components|lib|prisma|e2e)/|apps/contracts/|scripts/|\\.github/workflows/(test|coverage|codeql|doc-gardening)\\.yml$|package\\.json$|pnpm-workspace\\.yaml$|ARCHITECTURE\\.md$)'
export COBUILD_DRIFT_CODE_CHANGE_LABEL='Architecture-sensitive code'
export COBUILD_DRIFT_LARGE_CHANGE_THRESHOLD='12'
export COBUILD_DRIFT_CHANGED_COUNT_EXCLUDE_PATTERN='^agent-docs/generated/|^agent-docs/exec-plans/(active|completed)/|^pnpm-lock\\.yaml$'
export COBUILD_DRIFT_ALLOW_RELEASE_ARTIFACTS_ONLY='0'
export COBUILD_COMMITTER_EXAMPLE='fix(auth): guard session mismatch'
export COBUILD_COMMITTER_DISALLOW_GLOBS=lib/\*$'\n'./lib/\*$'\n'
