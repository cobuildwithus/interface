"use server";

import { normalizeEvmAddress as normalizeAddress } from "@cobuild/wire";
import { getSession } from "@/lib/domains/auth/session";
import { registerDirectIntent } from "@/lib/server/swaps-direct-intent";

export async function registerDirectIntentAction(body: {
  txHash?: string;
  tokenAddress?: string;
  entityId?: string;
  chainId?: number;
  recipient?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session.address) {
    return { ok: false, error: "Unauthorized" };
  }

  let ownerAddress: `0x${string}`;
  try {
    ownerAddress = normalizeAddress(session.address, "session.address");
  } catch {
    return { ok: false, error: "Unauthorized" };
  }

  const result = await registerDirectIntent(body, { ownerAddress });
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}
