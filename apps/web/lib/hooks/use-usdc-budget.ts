"use client";

import { contracts } from "@/lib/domains/token/onchain/addresses";
import { erc20Abi } from "viem";
import { base } from "viem/chains";
import { useAccount, useReadContract } from "wagmi";

export interface UsdcBudgetResult {
  loading: boolean;
  allowance: bigint | null;
  refetch: () => void;
}

export function useUsdcBudget(): UsdcBudgetResult {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: contracts.USDCBase,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, contracts.CobuildSwap] : undefined,
    chainId: base.id,
  });

  return { loading: isLoading, allowance: data ?? null, refetch };
}
