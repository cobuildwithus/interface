"use client";

import { contracts } from "@/lib/domains/token/onchain/addresses";
import { usdc } from "@/lib/domains/token/usdc";
import { erc20Abi } from "viem";
import { base } from "viem/chains";
import { useAccount, useReadContract } from "wagmi";

export function useUsdcBalance() {
  const { address } = useAccount();

  const { data, isLoading, refetch } = useReadContract({
    address: contracts.USDCBase,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: base.id,
  });

  const balance = data ?? null;
  const balanceUsd = balance != null ? usdc.format(balance) : null;

  return { usdcBalance: balance, balanceUsd, loading: isLoading, refetch };
}
