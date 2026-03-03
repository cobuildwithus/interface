import "server-only";

import type { EvmSmartAccount } from "@coinbase/cdp-sdk";

type WaitForUserOperationBaseParams = {
  smartAccount: EvmSmartAccount;
  userOpHash: `0x${string}`;
  label: string;
  createError: (message: string) => Error;
};

type WaitForUserOperationWithHash = WaitForUserOperationBaseParams & {
  requireTransactionHash: true;
};

type WaitForUserOperationMaybeHash = WaitForUserOperationBaseParams & {
  requireTransactionHash?: boolean;
};

export async function waitForUserOperationComplete(
  params: WaitForUserOperationWithHash
): Promise<`0x${string}`>;
export async function waitForUserOperationComplete(
  params: WaitForUserOperationMaybeHash
): Promise<`0x${string}` | null>;
export async function waitForUserOperationComplete(
  params: WaitForUserOperationWithHash | WaitForUserOperationMaybeHash
): Promise<`0x${string}` | null> {
  const settled = await params.smartAccount.waitForUserOperation({
    userOpHash: params.userOpHash,
  });

  if (settled.status !== "complete") {
    throw params.createError(`${params.label} failed before confirmation`);
  }

  if (params.requireTransactionHash && !settled.transactionHash) {
    throw params.createError(`${params.label} did not return a transaction hash`);
  }

  return (settled.transactionHash ?? null) as `0x${string}` | null;
}
