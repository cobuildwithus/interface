"use server";

import type { Address, Hex } from "viem";
import { getSession } from "@/lib/domains/auth/session";
import { submitUsdcPermitServer, type SubmitPermitResponse } from "@/lib/server/usdc-permit";
import { normalizeAddress } from "@/lib/shared/address";

export async function submitUsdcPermitAction(body: {
  chainId?: number;
  token?: Address;
  owner: Address;
  spender: Address;
  value: string | number | bigint;
  deadline: string | number | bigint;
  signature: Hex;
}): Promise<SubmitPermitResponse> {
  const session = await getSession();
  let normalizedOwner: Address;
  try {
    normalizedOwner = normalizeAddress(body.owner);
  } catch {
    return { error: "Unauthorized" };
  }

  if (!session.address || normalizeAddress(session.address) !== normalizedOwner) {
    return { error: "Unauthorized" };
  }

  return submitUsdcPermitServer({
    ...body,
    value: typeof body.value === "bigint" ? body.value.toString() : body.value,
    deadline: typeof body.deadline === "bigint" ? body.deadline.toString() : body.deadline,
  });
}
