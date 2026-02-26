"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { parseEther, zeroAddress } from "viem";
import { jbMultiTerminalAbi } from "@/lib/domains/token/onchain/abis";
import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";
import {
  COBUILD_PROJECT_ID,
  REVNET_CHAIN_ID,
  NATIVE_TOKEN,
} from "@/lib/domains/token/onchain/revnet";
import { useRevnetData } from "./use-revnet-data";

/**
 * Hook for paying into the COBUILD revnet
 *
 * Handles:
 * - Fetching the primary terminal for ETH payments
 * - Executing the pay transaction
 * - Wallet connection and chain switching
 */
interface UseRevnetPayOptions {
  onSuccess?: (hash: string) => void;
  projectId?: bigint;
}

export function useRevnetPay(options: UseRevnetPayOptions = {}) {
  const { onSuccess, projectId = COBUILD_PROJECT_ID } = options;
  const { data: revnetData, isLoading: isLoadingRevnet } = useRevnetData(projectId);

  const terminalAddress = revnetData?.terminalAddress;
  const supportsEthPayments = revnetData?.supportsEthPayments ?? true;

  const {
    prepareWallet,
    writeContractAsync,
    isPending,
    isConfirming,
    isConfirmed,
    isLoading,
    hash,
    error,
    account,
  } = useContractTransaction({
    chainId: REVNET_CHAIN_ID,
    loading: "Processing payment…",
    success: "Payment successful! Tokens received.",
    onSuccess,
  });

  const pay = useCallback(
    async (ethAmount: string, options?: { beneficiary?: `0x${string}`; memo?: string }) => {
      let toastId: string | number | undefined;
      try {
        toastId = await prepareWallet();

        if (!terminalAddress || terminalAddress === zeroAddress) {
          throw new Error("Terminal not found for this project");
        }
        if (!supportsEthPayments) {
          throw new Error("ETH payments are unavailable for this project");
        }
        if (!account) {
          throw new Error("Wallet not connected");
        }

        const value = parseEther(ethAmount);
        const recipient = options?.beneficiary || account;
        const memo = options?.memo || "";

        await writeContractAsync({
          address: terminalAddress,
          abi: jbMultiTerminalAbi,
          functionName: "pay",
          args: [projectId, NATIVE_TOKEN, value, recipient, BigInt(0), memo, "0x"],
          value,
          chainId: REVNET_CHAIN_ID,
        });
      } catch (error) {
        if (toastId) toast.dismiss(toastId);
        throw error;
      }
    },
    [prepareWallet, writeContractAsync, terminalAddress, account, projectId, supportsEthPayments]
  );

  const isReady = !isLoadingRevnet && !!terminalAddress && terminalAddress !== zeroAddress;

  return {
    pay,
    isPending,
    isConfirming,
    isConfirmed,
    isLoading,
    hash,
    error,
    terminalAddress,
    supportsEthPayments,
    isReady,
  };
}
