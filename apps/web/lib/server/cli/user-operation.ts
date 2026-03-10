import "server-only";

import type { EvmSmartAccount } from "@coinbase/cdp-sdk";

export class UserOperationTimeoutError extends Error {}

type WaitForUserOperationBaseParams = {
  smartAccount: EvmSmartAccount;
  userOpHash: `0x${string}`;
  label: string;
  createError: (message: string) => Error;
  timeoutMs?: number;
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
  const waitForSettlement = params.smartAccount.waitForUserOperation({
    userOpHash: params.userOpHash,
  });
  const timeoutMs = params.timeoutMs;

  const settled =
    typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
      ? await (async () => {
          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            return await Promise.race([
              waitForSettlement,
              new Promise<never>((_, reject) => {
                timeout = setTimeout(() => {
                  reject(
                    new UserOperationTimeoutError(
                      `${params.label} did not confirm before the server timeout`
                    )
                  );
                }, Math.floor(timeoutMs));
                timeout.unref?.();
              }),
            ]);
          } finally {
            if (timeout) {
              clearTimeout(timeout);
            }
          }
        })()
      : await waitForSettlement;

  if (settled.status !== "complete") {
    throw params.createError(`${params.label} failed before confirmation`);
  }

  if (params.requireTransactionHash && !settled.transactionHash) {
    throw params.createError(`${params.label} did not return a transaction hash`);
  }

  return (settled.transactionHash ?? null) as `0x${string}` | null;
}
