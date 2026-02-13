"use client";

import { useReadContract } from "wagmi";
import { revLoansAbi } from "@/lib/domains/token/onchain/abis";
import { REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";

export const useLoanFeeParams = (revLoansAddress?: `0x${string}`) => {
  const { data: revPrepaidFeePercent } = useReadContract({
    address: revLoansAddress,
    abi: revLoansAbi,
    functionName: "REV_PREPAID_FEE_PERCENT",
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!revLoansAddress },
  });

  const { data: minPrepaidFeePercent } = useReadContract({
    address: revLoansAddress,
    abi: revLoansAbi,
    functionName: "MIN_PREPAID_FEE_PERCENT",
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!revLoansAddress },
  });

  const { data: maxPrepaidFeePercent } = useReadContract({
    address: revLoansAddress,
    abi: revLoansAbi,
    functionName: "MAX_PREPAID_FEE_PERCENT",
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!revLoansAddress },
  });

  return {
    revPrepaidFeePercent,
    minPrepaidFeePercent,
    maxPrepaidFeePercent,
  };
};
