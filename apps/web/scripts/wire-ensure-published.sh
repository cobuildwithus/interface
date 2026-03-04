#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd -- "$PACKAGE_ROOT/../.." && pwd)"
PACKAGE_JSON="$PACKAGE_ROOT/package.json"
LOCKFILE="$REPO_ROOT/pnpm-lock.yaml"

read_wire_spec() {
  node - "$PACKAGE_JSON" <<'NODE'
const fs = require("node:fs");
const packageJsonPath = process.argv[2];
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const wireSpec = packageJson.dependencies?.["@cobuild/wire"];
if (typeof wireSpec === "string") {
  process.stdout.write(wireSpec);
}
NODE
}

write_wire_spec() {
  local target_spec="$1"

  node - "$PACKAGE_JSON" "$target_spec" <<'NODE'
const fs = require("node:fs");
const packageJsonPath = process.argv[2];
const targetSpec = process.argv[3];
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

if (!packageJson.dependencies || typeof packageJson.dependencies !== "object") {
  throw new Error("package.json is missing a dependencies object");
}

packageJson.dependencies["@cobuild/wire"] = targetSpec;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
NODE
}

is_local_wire_spec() {
  local spec="${1:-}"
  [[ "$spec" == *"../wire"* ]] || [[ "$spec" == link:*wire* ]] || [[ "$spec" == file:*wire* ]]
}

lockfile_has_local_wire() {
  [[ -f "$LOCKFILE" ]] || return 1

  rg --quiet --fixed-strings "@cobuild/wire@file:../wire" "$LOCKFILE" || \
    rg --quiet --fixed-strings "file:../../../wire" "$LOCKFILE" || \
    rg --quiet --fixed-strings "link:../../../wire" "$LOCKFILE" || \
    rg --quiet --fixed-strings "directory: ../wire" "$LOCKFILE"
}

current_spec="$(read_wire_spec)"
if [[ -z "$current_spec" ]]; then
  echo "Unable to read dependencies.@cobuild/wire from $PACKAGE_JSON" >&2
  exit 1
fi

if ! is_local_wire_spec "$current_spec" && ! lockfile_has_local_wire; then
  exit 0
fi

latest_version="$(pnpm view @cobuild/wire version --json | tr -d '"[:space:]')"
if [[ -z "$latest_version" ]]; then
  echo "Failed to resolve latest published version for @cobuild/wire." >&2
  exit 1
fi

target_spec="^$latest_version"
echo "Found local @cobuild/wire reference ($current_spec). Switching to published $target_spec."

write_wire_spec "$target_spec"
(cd "$REPO_ROOT" && pnpm install --lockfile-only)

resolved_spec="$(read_wire_spec)"
if is_local_wire_spec "$resolved_spec" || lockfile_has_local_wire; then
  echo "Failed to replace local @cobuild/wire references in package or lockfile." >&2
  exit 1
fi

echo "Resolved @cobuild/wire to $resolved_spec."
