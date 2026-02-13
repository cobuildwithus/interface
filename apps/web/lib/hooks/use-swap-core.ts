"use client";

import { useState, useCallback, useDeferredValue, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { useRevnetPay } from "./use-revnet-pay";
import { usePaymentQuote } from "./use-payment-quote";
import {
  REVNET_CHAIN_ID,
  GAS_BUFFER,
  COBUILD_PROJECT_ID,
} from "@/lib/domains/token/onchain/revnet";
import { getEthForTokens } from "@/lib/domains/token/onchain/quote";
import {
  BUTTON_TEXT,
  isValidDecimalInput,
  getButtonState,
  checkInsufficientBalance,
  isSwapDisabled,
} from "@/lib/domains/token/onchain/swap-utils";

interface UseSwapCoreOptions {
  onSuccess?: (hash: string) => void;
  beneficiaryAddress?: `0x${string}`;
  projectId?: bigint;
}

/**
 * Core swap hook for payment flows
 *
 * Handles:
 * - Bidirectional input (ETH → tokens or tokens → ETH)
 * - ETH balance fetching
 * - Token quote calculation
 * - Button state logic
 */
export function useSwapCore(options: UseSwapCoreOptions = {}) {
  const { onSuccess, beneficiaryAddress, projectId = COBUILD_PROJECT_ID } = options;
  const [payAmount, setPayAmount] = useState("");
  const [manualTokens, setManualTokens] = useState<string | null>(null);
  const deferredPayAmount = useDeferredValue(payAmount);

  const { address } = useAccount();

  const { data: ethBalance } = useBalance({
    address,
    chainId: REVNET_CHAIN_ID,
  });

  const {
    formattedQuote,
    isLoading: isLoadingQuote,
    isPaused,
    reservedPercent,
    weight,
  } = usePaymentQuote(deferredPayAmount, projectId);

  const handleSuccess = useCallback(
    (hash: string) => {
      setPayAmount("");
      setManualTokens(null);
      onSuccess?.(hash);
    },
    [onSuccess]
  );

  const {
    pay,
    isLoading: isPayLoading,
    isReady,
    supportsEthPayments,
  } = useRevnetPay({ onSuccess: handleSuccess, projectId });

  const hasInsufficientBalance = useMemo(
    () => checkInsufficientBalance(payAmount, ethBalance?.value),
    [payAmount, ethBalance?.value]
  );

  const buttonState = useMemo(
    () =>
      getButtonState({
        isPayLoading,
        isReady,
        isPaused,
        hasInsufficientBalance,
        isEthSupported: supportsEthPayments,
      }),
    [isPayLoading, isReady, isPaused, hasInsufficientBalance, supportsEthPayments]
  );

  const isDisabled = isSwapDisabled(buttonState, payAmount);

  const handlePayAmountChange = useCallback((value: string) => {
    if (!isValidDecimalInput(value)) return;
    setManualTokens(null);
    setPayAmount(value);
  }, []);

  const handleTokensChange = useCallback(
    (tokens: string) => {
      const cleaned = tokens.replace(/,/g, "");
      if (!isValidDecimalInput(cleaned)) return;

      setManualTokens(tokens);
      if (!weight || reservedPercent == null) return;

      const parsed = parseFloat(cleaned);
      if (isNaN(parsed) || parsed <= 0) {
        setPayAmount("");
        return;
      }

      try {
        const tokensBigInt = parseUnits(cleaned, 18);
        const ethWei = getEthForTokens(tokensBigInt, weight, reservedPercent);
        setPayAmount(formatUnits(ethWei, 18));
      } catch {
        setPayAmount("");
      }
    },
    [weight, reservedPercent]
  );

  const handleMaxClick = useCallback(() => {
    setManualTokens(null);
    if (ethBalance) {
      const maxAmount = ethBalance.value - GAS_BUFFER;
      if (maxAmount > BigInt(0)) {
        setPayAmount(formatUnits(maxAmount, 18));
      }
    }
  }, [ethBalance]);

  const handleSwap = useCallback(
    async (memo?: string) => {
      if (isDisabled) return;
      await pay(payAmount, {
        memo,
        beneficiary: beneficiaryAddress,
      });
    },
    [pay, payAmount, isDisabled, beneficiaryAddress]
  );

  const formattedBalance = ethBalance
    ? parseFloat(formatUnits(ethBalance.value, 18)).toFixed(4)
    : "0.00";

  const displayTokens = manualTokens ?? formattedQuote.payerTokens;

  return {
    payAmount,
    displayTokens,
    formattedQuote,
    formattedBalance,
    ethBalance,
    isLoadingQuote,
    isDisabled,
    buttonText: BUTTON_TEXT[buttonState],
    hasWallet: !!address,

    onPayAmountChange: handlePayAmountChange,
    onTokensChange: handleTokensChange,
    onMaxClick: handleMaxClick,
    onSwap: handleSwap,
  };
}
