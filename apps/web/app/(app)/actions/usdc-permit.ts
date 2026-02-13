"use server";

import type { Address, Hex } from "viem";
import { submitUsdcPermitServer, type SubmitPermitResponse } from "@/lib/server/usdc-permit";

export async function submitUsdcPermitAction(body: {
  chainId?: number;
  token?: Address;
  owner: Address;
  spender: Address;
  value: string | number | bigint;
  deadline: string | number | bigint;
  signature: Hex;
}): Promise<SubmitPermitResponse> {
  return submitUsdcPermitServer({
    ...body,
    value: typeof body.value === "bigint" ? body.value.toString() : body.value,
    deadline: typeof body.deadline === "bigint" ? body.deadline.toString() : body.deadline,
  });
}
