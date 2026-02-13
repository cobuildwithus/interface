"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { erc20Abi, formatUnits, parseUnits } from "viem";
import { usePublicClient, useReadContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import {
  jbMultiTerminalAbi,
  jbPermissionsAbi,
  revLoansAbi,
} from "@/lib/domains/token/onchain/abis";
import { NATIVE_TOKEN, REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";
import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";
import {
  LOAN_LIQUIDATION_YEARS,
  MAX_PREPAID_FEE_PERCENT,
  MIN_PREPAID_FEE_PERCENT,
  REPAY_OPTIONS,
} from "./constants";
import { createBorrowHandler } from "./borrow-handler";
import { useLoanFeeParams } from "./loan-fee-queries";
import { calculateLoanMetrics } from "./loan-metrics";
import { formatDisplay, normalizeAddress } from "./utils";
import type { RevnetPosition } from "./types";

export function useLoanDialogState(position: RevnetPosition) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [collateralAmount, setCollateralAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState<"permission" | "loan" | null>(null);
  const [repayYears, setRepayYears] = useState<(typeof REPAY_OPTIONS)[number]["years"]>(1);

  const collateralCount = useMemo(() => {
    if (!collateralAmount) return 0n;
    try {
      return parseUnits(collateralAmount, position.tokenDecimals);
    } catch {
      return 0n;
    }
  }, [collateralAmount, position.tokenDecimals]);

  const isCollateralValid = collateralCount > 0n && collateralCount <= position.tokenBalance;

  const maxCollateral = formatUnits(position.tokenBalance, position.tokenDecimals);
  const canFillMax = position.isConnected && position.tokenBalance > 0n;
  const balanceLabel = position.isConnected
    ? `Balance: ${formatDisplay(maxCollateral)} ${position.tokenSymbol}`
    : "Connect wallet";

  const revLoansAddress = position.revLoansAddress as `0x${string}`;
  const permissionsAddress = position.permissionsAddress as `0x${string}`;

  const { data: loanSources } = useReadContract({
    address: revLoansAddress,
    abi: revLoansAbi,
    functionName: "loanSourcesOf",
    args: [position.projectId],
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!revLoansAddress },
  });

  const selectedLoanSource = useMemo(() => {
    if (!loanSources?.length) return undefined;
    const baseToken = position.baseTokenContext?.token;
    if (baseToken) {
      const matchingSource = loanSources.find(
        (source) => normalizeAddress(source.token) === normalizeAddress(baseToken)
      );
      if (matchingSource) return matchingSource;
    }
    return loanSources[0];
  }, [loanSources, position.baseTokenContext?.token]);

  const loanSourceToken = selectedLoanSource?.token ?? position.baseTokenContext?.token;
  const loanSourceTerminal = selectedLoanSource?.terminal ?? position.terminalAddress;
  const isNativeLoanToken =
    !!loanSourceToken && normalizeAddress(loanSourceToken) === normalizeAddress(NATIVE_TOKEN);

  const { data: loanSourceTokenSymbol } = useReadContract({
    address: !isNativeLoanToken ? (loanSourceToken as `0x${string}`) : undefined,
    abi: erc20Abi,
    functionName: "symbol",
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!loanSourceToken && !isNativeLoanToken },
  });

  const { data: loanSourceAccountingContext } = useReadContract({
    address: loanSourceTerminal as `0x${string}` | undefined,
    abi: jbMultiTerminalAbi,
    functionName: "accountingContextForTokenOf",
    args:
      loanSourceTerminal && loanSourceToken
        ? [position.projectId, loanSourceToken as `0x${string}`]
        : undefined,
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!loanSourceTerminal && !!loanSourceToken },
  });

  const borrowableContext = loanSourceAccountingContext ?? position.baseTokenContext;

  const { revPrepaidFeePercent, minPrepaidFeePercent, maxPrepaidFeePercent } =
    useLoanFeeParams(revLoansAddress);

  const { data: borrowableAmount } = useReadContract({
    address: revLoansAddress,
    abi: revLoansAbi,
    functionName: "borrowableAmountFrom",
    args:
      borrowableContext && collateralCount > 0n
        ? [
            position.projectId,
            collateralCount,
            BigInt(borrowableContext.decimals),
            BigInt(borrowableContext.currency),
          ]
        : undefined,
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!borrowableContext && collateralCount > 0n && !!revLoansAddress },
  });

  const { data: hasPermission, refetch: refetchPermission } = useReadContract({
    address: permissionsAddress,
    abi: jbPermissionsAbi,
    functionName: "hasPermission",
    args: position.account
      ? [revLoansAddress, position.account, position.projectId, 1n, true, true]
      : undefined,
    chainId: REVNET_CHAIN_ID,
    query: { enabled: !!position.account && !!permissionsAddress && !!revLoansAddress },
  });

  const needsPermission = hasPermission !== true;

  const publicClient = usePublicClient({ chainId: REVNET_CHAIN_ID });

  const permissionTx = useContractTransaction({
    chainId: REVNET_CHAIN_ID,
    loading: "Granting permission...",
    success: "Permission granted",
  });

  const borrowTx = useContractTransaction({
    chainId: REVNET_CHAIN_ID,
    loading: "Creating loan...",
    success: "Loan created",
    onSuccess: () => {
      router.refresh();
      queryClient.invalidateQueries({
        predicate: (query) => {
          const [key, params] = query.queryKey as [string, { functionName?: string }?];
          if (key !== "readContract" || !params?.functionName) return false;
          return (
            params.functionName === "totalBalanceOf" ||
            params.functionName === "currentReclaimableSurplusOf" ||
            params.functionName === "balanceOf"
          );
        },
      });
    },
  });

  const minPrepaidFeePercentBps = Number(minPrepaidFeePercent ?? BigInt(MIN_PREPAID_FEE_PERCENT));
  const maxPrepaidFeePercentBps = Number(maxPrepaidFeePercent ?? BigInt(MAX_PREPAID_FEE_PERCENT));

  const prepaidFeePercent = useMemo(() => {
    const rawFee = (repayYears / LOAN_LIQUIDATION_YEARS) * maxPrepaidFeePercentBps;
    const rounded = Math.round(rawFee);
    if (!Number.isFinite(rounded)) return minPrepaidFeePercentBps;
    return Math.min(
      maxPrepaidFeePercentBps,
      Math.max(minPrepaidFeePercentBps, rounded || minPrepaidFeePercentBps)
    );
  }, [repayYears, minPrepaidFeePercentBps, maxPrepaidFeePercentBps]);

  const baseTokenSymbol = isNativeLoanToken
    ? "ETH"
    : ((loanSourceTokenSymbol as string | undefined) ?? position.baseTokenSymbol);
  const borrowableDecimals = borrowableContext?.decimals ?? 18;

  const {
    borrowDisplay,
    principalDisplay,
    upfrontFeeDisplay,
    maxRepayDisplay,
    collateralDisplay,
    repayWindowLabel,
    prepaidPercentLabel,
    revFeePercentLabel,
    feeWindowNote,
    hasFullPrepayCoverage,
  } = calculateLoanMetrics({
    borrowableAmount,
    borrowableDecimals,
    collateralAmount,
    maxPrepaidFeePercentBps,
    prepaidFeePercent,
    repayYears,
    revPrepaidFeePercent,
  });

  const isProcessing = isSubmitting || borrowTx.isLoading || permissionTx.isLoading;
  const buttonLabel = isProcessing
    ? needsPermission && submitStep === "permission"
      ? "Granting permission..."
      : "Creating loan..."
    : "Take loan";

  const handleBorrow = createBorrowHandler({
    position,
    revLoansAddress,
    permissionsAddress,
    loanSourceToken,
    loanSourceTerminal,
    collateralCount,
    prepaidFeePercent,
    isCollateralValid,
    needsPermission,
    borrowTx,
    permissionTx,
    publicClient: publicClient ?? null,
    refetchPermission,
    setIsSubmitting,
    setSubmitStep,
  });

  return {
    collateralAmount,
    setCollateralAmount,
    isCollateralValid,
    maxCollateral,
    canFillMax,
    balanceLabel,
    repayYears,
    setRepayYears,
    borrowDisplay,
    principalDisplay,
    upfrontFeeDisplay,
    baseTokenSymbol,
    maxRepayDisplay,
    collateralDisplay,
    repayWindowLabel,
    prepaidPercentLabel,
    revFeePercentLabel,
    feeWindowNote,
    hasFullPrepayCoverage,
    isProcessing,
    buttonLabel,
    handleBorrow,
  };
}
