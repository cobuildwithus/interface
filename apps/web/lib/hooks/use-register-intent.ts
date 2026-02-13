"use client";

import { useCallback, useState } from "react";
import { BASE_CHAIN_ID } from "@/lib/domains/token/onchain/addresses";
import { normalizeEntityId } from "@/lib/shared/entity-id";
import { registerDirectIntentAction } from "@/app/(app)/actions/swaps-direct-intent";

interface UseRegisterIntentOptions {
  entityId?: string;
  castHash?: string;
  beneficiaryAddress?: `0x${string}`;
  tokenAddress: `0x${string}`;
  onSuccess?: (txHash: string) => void;
}

export function useRegisterIntent({
  entityId,
  castHash,
  beneficiaryAddress,
  tokenAddress,
  onSuccess,
}: UseRegisterIntentOptions) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const canRetry = Boolean(lastTxHash && registerError);

  const registerIntent = useCallback(
    async (txHash: string) => {
      const normalizedEntityId = normalizeEntityId(entityId ?? castHash);
      if (!normalizedEntityId) {
        setRegisterError("Missing submission id; cannot record boost. Contact @rocketman.");
        return;
      }

      setIsRegistering(true);
      setRegisterError(null);
      setLastTxHash(txHash);

      try {
        const result = await registerDirectIntentAction({
          txHash,
          chainId: BASE_CHAIN_ID,
          tokenAddress,
          entityId: normalizedEntityId,
          recipient: beneficiaryAddress,
        });

        if (!result.ok) {
          setRegisterError(
            result.error ?? "Failed to record boost. Please retry or reach out to @rocketman."
          );
          return;
        }

        onSuccess?.(txHash);
      } catch (error) {
        console.error("register intent failed", error);
        setRegisterError("Unexpected error recording boost. Retry or contact @rocketman.");
      } finally {
        setIsRegistering(false);
      }
    },
    [beneficiaryAddress, castHash, entityId, onSuccess, tokenAddress]
  );

  const retry = useCallback(() => {
    if (lastTxHash) {
      void registerIntent(lastTxHash);
    }
  }, [lastTxHash, registerIntent]);

  return {
    isRegistering,
    registerError,
    canRetry,
    registerIntent,
    retry,
  };
}
