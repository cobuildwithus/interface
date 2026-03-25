#!/usr/bin/env bash
set -euo pipefail

COBUILD_REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

consumer_shell_path=""
for candidate in \
  "$COBUILD_REPO_ROOT/node_modules/@cobuild/repo-tools/src/consumer-shell.sh" \
  "$COBUILD_REPO_ROOT/../repo-tools/src/consumer-shell.sh"
do
  if [ -f "$candidate" ]; then
    consumer_shell_path="$candidate"
    break
  fi
done

if [ -z "$consumer_shell_path" ]; then
  echo "Error: missing repo-tools consumer shell helper. Install dependencies first." >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$consumer_shell_path"

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
export COBUILD_AUDIT_CONTEXT_PREFIX='cobuild-interface-audit'
export COBUILD_AUDIT_CONTEXT_TITLE='Cobuild Interface Audit Bundle'
export COBUILD_AUDIT_CONTEXT_REPO_LABEL='interface'
export COBUILD_AUDIT_CONTEXT_SENSITIVE_NOTE='Sensitive files (for example `.env*`, private keys/certs, and credential files) are always excluded.'
export COBUILD_AUDIT_CONTEXT_EXCLUDE_SENSITIVE='1'
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_ALWAYS_PATHS \
  "AGENTS.md" \
  "AGENT_NOTES.md" \
  "ARCHITECTURE.md" \
  "CONTRIBUTING.md" \
  "README.md" \
  "SECURITY.md" \
  "SUPPORT.md" \
  "package.json" \
  "pnpm-lock.yaml" \
  "pnpm-workspace.yaml" \
  "tsconfig.json" \
  "apps/web/AGENTS.md"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_SCAN_SPECS \
  "apps" \
  "scripts"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_TEST_SCAN_SPECS \
  "tests" \
  "test"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_DOC_SCAN_SPECS \
  "agent-docs:*.md" \
  "agent-docs/references:*.txt"
repo_tools_join_lines COBUILD_AUDIT_CONTEXT_CI_SCAN_SPECS \
  ".github/workflows"
