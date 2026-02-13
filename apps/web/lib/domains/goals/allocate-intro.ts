import "server-only";

import { kv } from "@vercel/kv";

const INTRO_KEY_PREFIX = "allocate:intro:dismissed";

function normalizeGoalAddress(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function getIntroKey(address: string, goalAddress: string): string | null {
  const normalizedGoal = normalizeGoalAddress(goalAddress);
  if (!normalizedGoal) return null;
  return `${INTRO_KEY_PREFIX}:${address.toLowerCase()}:${normalizedGoal}`;
}

export async function getAllocateIntroDismissed(
  address: string,
  goalAddress: string
): Promise<boolean> {
  const key = getIntroKey(address, goalAddress);
  if (!key) return false;

  try {
    const result = await kv.get<string | null>(key);
    return Boolean(result);
  } catch {
    return false;
  }
}

export async function setAllocateIntroDismissed(
  address: string,
  goalAddress: string
): Promise<boolean> {
  const key = getIntroKey(address, goalAddress);
  if (!key) return false;

  try {
    await kv.set(key, "1");
    return true;
  } catch {
    return false;
  }
}
