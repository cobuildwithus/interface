"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EthBadge } from "@/components/features/token/token-badge";
import { useBoostSwap } from "@/lib/hooks/use-boost-swap";
import { useRegisterIntent } from "@/lib/hooks/use-register-intent";
import { contracts } from "@/lib/domains/token/onchain/addresses";

interface BoostSwapProps {
  onIntentSuccess?: (hash: string) => void;
  username?: string;
  beneficiaryAddress?: `0x${string}`;
  isOwnPost?: boolean;
  isScoreIneligible?: boolean;
  castHash?: string;
  tokenAddress?: `0x${string}`;
}

/**
 * Simplified swap component for boosting submissions
 *
 * Features:
 * - ETH amount input with balance display
 * - USD preset buttons ($1, $5, $25, Max)
 * - Comment/memo field for transaction
 * - Integrates with revnet pay flow
 */
export function BoostSwap({
  onIntentSuccess,
  username,
  beneficiaryAddress,
  isOwnPost,
  isScoreIneligible,
  castHash,
  tokenAddress = contracts.CobuildToken as `0x${string}`,
}: BoostSwapProps) {
  const defaultMemo = username ? `Boosting @${username}'s work on co.build` : undefined;

  const { isRegistering, registerError, canRetry, registerIntent, retry } = useRegisterIntent({
    castHash,
    beneficiaryAddress,
    tokenAddress,
    onSuccess: onIntentSuccess,
  });

  const {
    payAmount,
    memo,
    formattedBalance,
    ethPriceUsdc,
    isDisabled,
    buttonText,
    hasWallet,
    memoMaxLength,
    usdPresets,
    onPayAmountChange,
    onMemoChange,
    onMaxClick,
    onPresetClick,
    onSwap,
  } = useBoostSwap({
    onSuccess: () => {},
    onTxConfirmed: registerIntent,
    beneficiaryAddress,
    defaultMemo,
  });

  const usdValue = payAmount ? parseFloat(payAmount) * ethPriceUsdc : 0;

  const disablePayButton =
    isDisabled || isOwnPost || isScoreIneligible || isRegistering || canRetry;

  const handleSwapClick = useCallback(async () => {
    try {
      await onSwap();
    } catch (error) {
      console.error("Boost swap failed", error);
      const message = error instanceof Error ? error.message : "Payment failed. Please try again.";
      const lower = message.toLowerCase();
      const isUserRejection = lower.includes("user rejected") || lower.includes("user denied");

      if (!isUserRejection) {
        toast.error(message);
      }
    }
  }, [onSwap]);

  return (
    <div className="space-y-3">
      {/* ETH Amount Input */}
      <div className="bg-secondary rounded-xl p-4 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Input
            type="text"
            inputMode="decimal"
            variant="amount"
            placeholder="0.0"
            value={payAmount}
            onChange={(e) => onPayAmountChange(e.target.value)}
            className="placeholder:text-muted-foreground/40 h-auto flex-1 p-0 font-medium"
          />
          <EthBadge />
        </div>
        <div className="text-muted-foreground mt-2 flex justify-between text-xs">
          <span>{payAmount ? `$${usdValue.toFixed(2)}` : ""}</span>
          {hasWallet && (
            <button
              type="button"
              onClick={onMaxClick}
              className="hover:text-foreground transition-colors"
            >
              Balance: {formattedBalance}
            </button>
          )}
        </div>
      </div>

      {/* USD Preset Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {usdPresets.map((usd) => (
          <Button
            key={usd}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPresetClick(usd)}
            className="h-9 rounded-lg"
          >
            ${usd}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMaxClick}
          className="h-9 rounded-lg"
        >
          Max
        </Button>
      </div>

      {/* Comment/Memo Field */}
      <Input
        type="text"
        className="h-12 text-sm"
        placeholder="Add a comment…"
        value={memo}
        onChange={(e) => onMemoChange(e.target.value)}
        maxLength={memoMaxLength}
      />

      {/* Fund Button */}
      <AuthButton
        className="h-12 w-full bg-emerald-500 text-base font-semibold text-white hover:bg-emerald-600"
        onClick={handleSwapClick}
        disabled={disablePayButton}
        connectLabel="Connect Wallet"
      >
        {isRegistering
          ? "Recording boost…"
          : buttonText === "Buy $COBUILD"
            ? username
              ? `Fund @${username}`
              : "Fund"
            : buttonText}
      </AuthButton>
      {registerError && (
        <div
          className="rounded-lg border px-3 py-2.5 text-sm"
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            borderColor: "rgba(239, 68, 68, 0.2)",
          }}
        >
          <p className="leading-snug font-medium text-red-500">{registerError}</p>
          <div className="mt-2 flex items-center gap-3">
            {canRetry && (
              <Button
                size="sm"
                variant="outline"
                onClick={retry}
                disabled={isRegistering}
                className="h-8 border-red-500/30 px-3 text-red-500 hover:bg-red-500/10"
              >
                Retry
              </Button>
            )}
            <a
              className="text-sm text-emerald-500 underline underline-offset-2 transition-colors hover:text-emerald-400"
              href="https://farcaster.xyz/rocketman"
              target="_blank"
              rel="noreferrer"
            >
              Message @rocketman
            </a>
          </div>
        </div>
      )}
      {isOwnPost && (
        <p className="text-muted-foreground text-center text-xs">
          You cannot boost your own submission.
        </p>
      )}
      {isScoreIneligible && !isOwnPost && (
        <p className="text-muted-foreground text-center text-xs">
          Your account doesn&apos;t meet the requirements to boost.
        </p>
      )}
    </div>
  );
}
