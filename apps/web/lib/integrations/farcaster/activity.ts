import "server-only";

import { randomUUID } from "node:crypto";
import { kv } from "@vercel/kv";
import { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/server/db/cobuild-db-client";
import { getFarcasterChannelUrl } from "@/lib/integrations/farcaster/urls";
import { CACHE_TTL } from "@/lib/config/cache";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

const COBUILD_CHANNEL_URL = getFarcasterChannelUrl("cobuild");
const TWO_WEEK_SECONDS = 60 * 60 * 24 * 14;
const ACTIVITY_CACHE_KEY = "farcaster-activity-v5";
const ACTIVITY_LOCK_TTL_SECONDS = 10;
const ACTIVITY_LOCK_WAIT_MS = 4_000;
const ACTIVITY_LOCK_POLL_MS = 200;

type ActivityRow = {
  fid?: bigint | number | null;
  posts: bigint | number | null;
  periods: bigint | number | null;
};

type ActivityStats = {
  activity: number;
  posts: number;
};

function toPositiveInt(value: bigint | number | null | undefined): number | null {
  if (typeof value === "bigint") {
    if (value <= 0n) return null;
    return Number(value);
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const truncated = Math.trunc(value);
  return truncated > 0 ? truncated : null;
}

function toCount(value: bigint | number | null | undefined): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 0;
}

function toActivityStats(posts: number, periods: number): ActivityStats {
  return { activity: Math.min(posts, periods * 14), posts };
}

function getActivityCacheKey(fid: number): string {
  return `${ACTIVITY_CACHE_KEY}:${fid}`;
}

function getActivityLockKey(fid: number): string {
  return `${getActivityCacheKey(fid)}:lock`;
}

function isActivityStats(value: JsonValue | null | undefined): value is ActivityStats {
  if (!value || typeof value !== "object") return false;
  const record = value as JsonRecord;
  return (
    typeof record.activity === "number" &&
    Number.isFinite(record.activity) &&
    typeof record.posts === "number" &&
    Number.isFinite(record.posts)
  );
}

async function readActivityCache(fids: number[]): Promise<Map<number, ActivityStats>> {
  if (fids.length === 0) return new Map();

  const keys = fids.map(getActivityCacheKey);
  let results: Array<ActivityStats | null> = [];

  try {
    results = await kv.mget<ActivityStats[]>(...keys);
  } catch {
    return new Map();
  }

  const map = new Map<number, ActivityStats>();
  results.forEach((value, index) => {
    if (isActivityStats(value)) {
      map.set(fids[index]!, value);
    }
  });

  return map;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForActivityCache(fid: number, maxWaitMs: number): Promise<ActivityStats | null> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const cached = await readActivityCache([fid]);
    const hit = cached.get(fid);
    if (hit) return hit;
    await sleep(ACTIVITY_LOCK_POLL_MS);
  }
  return null;
}

async function writeActivityCache(entries: Map<number, ActivityStats>): Promise<void> {
  if (entries.size === 0) return;

  await Promise.all(
    Array.from(entries.entries()).map(async ([fid, stats]) => {
      try {
        await kv.set(getActivityCacheKey(fid), stats, { ex: CACHE_TTL.PROFILE });
      } catch {
        // Ignore KV failures to avoid breaking UX.
      }
    })
  );
}

async function fetchCobuildActivity(fid: number): Promise<ActivityStats> {
  const fidValue = BigInt(fid);
  const rows = await prisma.$replica().$queryRaw<ActivityRow[]>`
    SELECT
      COUNT(*)::bigint AS posts,
      COUNT(DISTINCT FLOOR(EXTRACT(EPOCH FROM c.timestamp) / ${TWO_WEEK_SECONDS}))::bigint AS periods
    FROM farcaster.casts c
    JOIN farcaster.profiles p ON p.fid = c.fid
    WHERE deleted_at IS NULL
      AND c.hidden_at IS NULL
      AND p.hidden_at IS NULL
      AND root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.fid = ${fidValue}
      AND c.timestamp IS NOT NULL
  `;
  const posts = toCount(rows[0]?.posts);
  const periods = toCount(rows[0]?.periods);
  return toActivityStats(posts, periods);
}

async function fetchCobuildActivityBatch(fids: number[]): Promise<Map<number, ActivityStats>> {
  if (fids.length === 0) return new Map();

  const fidValues = fids.map((fid) => BigInt(fid));
  const fidList = Prisma.join(fidValues.map((fid) => Prisma.sql`${fid}`));

  const rows = await prisma.$replica().$queryRaw<ActivityRow[]>`
    SELECT
      c.fid AS fid,
      COUNT(*)::bigint AS posts,
      COUNT(DISTINCT FLOOR(EXTRACT(EPOCH FROM c.timestamp) / ${TWO_WEEK_SECONDS}))::bigint AS periods
    FROM farcaster.casts c
    JOIN farcaster.profiles p ON p.fid = c.fid
    WHERE deleted_at IS NULL
      AND c.hidden_at IS NULL
      AND p.hidden_at IS NULL
      AND root_parent_url = ${COBUILD_CHANNEL_URL}
      AND c.fid IN (${fidList})
      AND c.timestamp IS NOT NULL
    GROUP BY c.fid
  `;

  const map = new Map<number, ActivityStats>();
  for (const row of rows) {
    const fid = toPositiveInt(row.fid);
    if (!fid) continue;
    const posts = toCount(row.posts);
    const periods = toCount(row.periods);
    map.set(fid, toActivityStats(posts, periods));
  }

  for (const fid of fids) {
    if (!map.has(fid)) {
      map.set(fid, toActivityStats(0, 0));
    }
  }

  return map;
}

export async function getCobuildActivityByFid(fid: number): Promise<ActivityStats> {
  const normalized = toPositiveInt(fid);
  if (!normalized) return { activity: 0, posts: 0 };

  const cached = await readActivityCache([normalized]);
  const hit = cached.get(normalized);
  if (hit) return hit;

  const lockKey = getActivityLockKey(normalized);
  const lockToken = randomUUID();
  let lockAcquired = false;

  try {
    const lockResult = await kv.set(lockKey, lockToken, {
      nx: true,
      ex: ACTIVITY_LOCK_TTL_SECONDS,
    });
    lockAcquired = lockResult === "OK";
  } catch {
    lockAcquired = false;
  }

  if (!lockAcquired) {
    const waited = await waitForActivityCache(normalized, ACTIVITY_LOCK_WAIT_MS);
    if (waited) return waited;
  }

  try {
    const stats = await fetchCobuildActivity(normalized);
    await writeActivityCache(new Map([[normalized, stats]]));
    return stats;
  } finally {
    if (lockAcquired) {
      try {
        const current = await kv.get<string>(lockKey);
        if (current === lockToken) {
          await kv.del(lockKey);
        }
      } catch {
        // ignore lock release failures
      }
    }
  }
}

export async function getCobuildActivityByFids(
  fids: Array<number | null | undefined>
): Promise<Map<number, ActivityStats>> {
  const unique = Array.from(
    new Set(fids.map(toPositiveInt).filter((fid): fid is number => fid !== null))
  );

  if (unique.length === 0) return new Map();

  const cached = await readActivityCache(unique);
  const missing = unique.filter((fid) => !cached.has(fid));

  if (missing.length === 0) return cached;

  const fetched = await fetchCobuildActivityBatch(missing);
  const result = new Map([...cached, ...fetched]);
  await writeActivityCache(fetched);

  return result;
}

export async function invalidateCobuildActivityCache(fid: number): Promise<void> {
  const normalized = toPositiveInt(fid);
  if (!normalized) return;

  try {
    await kv.del(getActivityCacheKey(normalized));
  } catch {
    // Ignore KV failures to avoid breaking UX.
  }
}
