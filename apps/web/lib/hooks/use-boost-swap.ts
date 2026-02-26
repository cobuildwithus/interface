"use client";

import { useState, useCallback } from "react";
import { useSwapCore } from "./use-swap-core";
import { useEthPrice } from "./use-eth-price";

const MEMO_MAX_LENGTH = 500;
const USD_PRESETS = [1, 5, 25] as const;

interface UseBoostSwapOptions {
  onSuccess?: (hash: string) => void;
  onTxConfirmed?: (hash: string) => void;
  beneficiaryAddress?: `0x${string}`;
  defaultMemo?: string;
}

/**
 * Hook for the BoostSwap component
 *
 * Extends useSwapCore with:
 * - Memo/comment state with validation
 * - USD preset amount handlers ($1, $5, $25)
 * - ETH price conversion
 * - Optional beneficiary address for funding another user
 */
export function useBoostSwap(options: UseBoostSwapOptions = {}) {
  const { onSuccess, onTxConfirmed, beneficiaryAddress, defaultMemo } = options;
  const [memo, setMemo] = useState("");
  const { usdToEth, ethPriceUsdc } = useEthPrice();

  const handleSuccess = useCallback(
    (hash: string) => {
      setMemo("");
      onSuccess?.(hash);
      onTxConfirmed?.(hash);
    },
    [onSuccess, onTxConfirmed]
  );

  const core = useSwapCore({
    onSuccess: handleSuccess,
    beneficiaryAddress,
  });

  const handleMemoChange = useCallback((value: string) => {
    if (value.length <= MEMO_MAX_LENGTH) {
      setMemo(value);
    }
  }, []);

  const handlePresetClick = useCallback(
    (usdAmount: number) => {
      const additionalEth = parseFloat(usdToEth(usdAmount));
      const currentEth = parseFloat(core.payAmount) || 0;
      const newTotal = currentEth + additionalEth;
      core.onPayAmountChange(newTotal.toFixed(8).replace(/\.?0+$/, ""));
    },
    [usdToEth, core]
  );

  // Wrap onSwap to include memo
  const handleSwap = useCallback(() => {
    return core.onSwap(memo || defaultMemo);
  }, [core, memo, defaultMemo]);

  return {
    payAmount: core.payAmount,
    formattedBalance: core.formattedBalance,
    isDisabled: core.isDisabled,
    buttonText: core.buttonText,
    hasWallet: core.hasWallet,

    memo,
    ethPriceUsdc,
    memoMaxLength: MEMO_MAX_LENGTH,
    usdPresets: USD_PRESETS,

    onPayAmountChange: core.onPayAmountChange,
    onMaxClick: core.onMaxClick,
    onSwap: handleSwap,
    onMemoChange: handleMemoChange,
    onPresetClick: handlePresetClick,
  };
}
