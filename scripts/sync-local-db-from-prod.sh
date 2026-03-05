#!/usr/bin/env bash
set -euo pipefail

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Error: pg_dump is required but not found on PATH." >&2
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "Error: pg_restore is required but not found on PATH." >&2
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Error: DATABASE_URL is not set (expected prod primary database URL)." >&2
  exit 1
fi

if [[ -z "${LOCAL_DATABASE_URL:-}" ]]; then
  echo "Error: LOCAL_DATABASE_URL is not set (expected local database URL)." >&2
  exit 1
fi

if [[ "${DATABASE_URL}" == "${LOCAL_DATABASE_URL}" ]]; then
  echo "Error: DATABASE_URL and LOCAL_DATABASE_URL must not be identical." >&2
  exit 1
fi

extract_host() {
  local url="$1"
  node -e '
const input = process.argv[1];
try {
  const parsed = new URL(input);
  process.stdout.write((parsed.hostname || "").toLowerCase());
} catch (error) {
  process.stderr.write(`Invalid database URL: ${input}\n`);
  process.exit(1);
}
' "${url}"
}

is_local_host() {
  local host="$1"
  [[ -z "${host}" || "${host}" == "localhost" || "${host}" == "127.0.0.1" || "${host}" == "::1" || "${host}" == "host.docker.internal" || "${host}" == "db" || "${host}" == "postgres" ]]
}

LOCAL_HOST="$(extract_host "${LOCAL_DATABASE_URL}")"
if ! is_local_host "${LOCAL_HOST}" && [[ "${ALLOW_NON_LOCAL_LOCAL_DB_SYNC:-}" != "true" ]]; then
  echo "Error: LOCAL_DATABASE_URL host '${LOCAL_HOST}' is not recognized as local." >&2
  echo "Set ALLOW_NON_LOCAL_LOCAL_DB_SYNC=true to override intentionally." >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="${ROOT_DIR}/.tmp"
mkdir -p "${TMP_DIR}"
TMP_DUMP="$(mktemp "${TMP_DIR}/prod-non-onchain.XXXXXX.dump")"

cleanup() {
  rm -f "${TMP_DUMP}"
}
trap cleanup EXIT

echo "Dumping prod schemas (excluding cobuild-onchain) from DATABASE_URL..."
pg_dump \
  --dbname="${DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --schema=cobuild \
  --schema=farcaster \
  --schema=capital_allocation \
  --file="${TMP_DUMP}"

echo "Restoring into LOCAL_DATABASE_URL..."
pg_restore \
  --dbname="${LOCAL_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "${TMP_DUMP}"

echo "Done. Local DB synced for schemas: cobuild, farcaster, capital_allocation."
