import { kv } from "@vercel/kv";
import { normalizeCastHashRaw } from "@/lib/domains/rules/cast-rules/normalize";

const READ_KEY_PREFIX = "cast:read";
const READ_COUNT_KEY_PREFIX = "cast:read:count";

function normalizeAddress(address: string): string | null {
  const normalized = address.trim().toLowerCase();
  return normalized ? normalized : null;
}

export async function markCastRead(address: string, hash: string): Promise<void> {
  const normalized = normalizeCastHashRaw(hash);
  if (!normalized) return;

  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return;

  const key = `${READ_KEY_PREFIX}:${normalizedAddress}:${normalized}`;
  try {
    const didSet = await kv.set(key, "1", { nx: true });
    if (didSet) {
      await kv.incr(`${READ_COUNT_KEY_PREFIX}:${normalizedAddress}`);
    }
  } catch {
    // Ignore KV failures to avoid breaking the user experience.
  }
}

export async function getReadStatusMap(
  address: string,
  hashes: string[]
): Promise<Record<string, boolean>> {
  const normalizedEntries = hashes
    .map((hash) => ({ hash, normalized: normalizeCastHashRaw(hash) }))
    .filter((entry): entry is { hash: string; normalized: string } => entry.normalized !== null);

  if (normalizedEntries.length === 0) return {};

  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return {};
  const keys = normalizedEntries.map(
    (entry) => `${READ_KEY_PREFIX}:${normalizedAddress}:${entry.normalized}`
  );

  let results: Array<string | null> = [];
  try {
    results = await kv.mget<(string | null)[]>(...keys);
  } catch {
    return {};
  }

  const map: Record<string, boolean> = {};
  normalizedEntries.forEach((entry, index) => {
    map[entry.hash] = Boolean(results[index]);
  });

  return map;
}

export async function getTopicsViewedCount(address: string): Promise<number> {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return 0;

  const key = `${READ_COUNT_KEY_PREFIX}:${normalizedAddress}`;
  try {
    const value = await kv.get<number | string | bigint | null>(key);
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  } catch {
    // Ignore KV failures to avoid breaking the user experience.
  }

  return 0;
}
