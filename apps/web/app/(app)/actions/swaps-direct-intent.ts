"use server";

import { registerDirectIntent } from "@/lib/server/swaps-direct-intent";

export async function registerDirectIntentAction(body: {
  txHash?: string;
  tokenAddress?: string;
  entityId?: string;
  chainId?: number;
  recipient?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await registerDirectIntent(body);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
