import "server-only";

import { kv } from "@vercel/kv";
import { unstable_cache } from "next/cache";

const ACTION_CARD_READ_KEY_PREFIX = "goal:action-card:read";
export const GOAL_ACTION_CARD_READ_CACHE_TAG = "goal-action-card-read";

function normalizeKeyPart(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCardIndex(cardIndex: number): number | null {
  if (!Number.isInteger(cardIndex) || cardIndex < 0) return null;
  return cardIndex;
}

function getActionCardReadKey(address: string, goalAddress: string): string | null {
  const normalizedAddress = normalizeKeyPart(address);
  const normalizedGoalAddress = normalizeKeyPart(goalAddress);
  if (!normalizedAddress || !normalizedGoalAddress) return null;
  return `${ACTION_CARD_READ_KEY_PREFIX}:${normalizedAddress}:${normalizedGoalAddress}`;
}

function normalizeStoredCardIndices(indices: readonly number[]): number[] {
  return [...new Set(indices.filter((index) => Number.isInteger(index) && index >= 0))].sort(
    (a, b) => a - b
  );
}

function parseStoredCardIndices(raw: number[] | string | null): number[] {
  if (Array.isArray(raw)) return normalizeStoredCardIndices(raw);
  if (typeof raw !== "string") return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeStoredCardIndices(
      parsed.filter((value): value is number => typeof value === "number")
    );
  } catch {
    return [];
  }
}

const getGoalActionCardReadIndicesCached = unstable_cache(
  async (key: string): Promise<number[]> => {
    try {
      const raw = await kv.get<number[] | string | null>(key);
      return parseStoredCardIndices(raw);
    } catch {
      return [];
    }
  },
  ["goal-action-card-read-indices-v1"],
  { revalidate: 300, tags: [GOAL_ACTION_CARD_READ_CACHE_TAG] }
);

export async function getGoalActionCardReadIndices(
  address: string,
  goalAddress: string
): Promise<number[]> {
  const key = getActionCardReadKey(address, goalAddress);
  if (!key) return [];
  return getGoalActionCardReadIndicesCached(key);
}

export async function setGoalActionCardRead(
  address: string,
  goalAddress: string,
  cardIndex: number
): Promise<boolean> {
  const key = getActionCardReadKey(address, goalAddress);
  const normalizedCardIndex = normalizeCardIndex(cardIndex);
  if (!key || normalizedCardIndex === null) return false;

  try {
    const existing = await kv.get<number[] | string | null>(key);
    const next = normalizeStoredCardIndices([
      ...parseStoredCardIndices(existing),
      normalizedCardIndex,
    ]);
    await kv.set(key, next);
    return true;
  } catch {
    return false;
  }
}
