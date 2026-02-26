"use client";

import { useState } from "react";
import { AuthButton } from "@/components/ui/auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConfirmSwapDialog,
  ConfirmSwapContent,
} from "@/components/features/funding/confirm-swap-dialog/confirm-swap-dialog";
import { EthBadge, CobuildBadge, SwapArrow } from "@/components/features/token/token-badge";
import { useSwapCore } from "@/lib/hooks/use-swap-core";
import { COBUILD_SWAP_PROJECT_ID } from "@/lib/domains/token/onchain/revnet";

interface SwapProps {
  className?: string;
  hideTitle?: boolean;
}

export function Swap({ className, hideTitle }: SwapProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  const {
    payAmount,
    displayTokens,
    formattedQuote,
    formattedBalance,
    ethBalance,
    isLoadingQuote,
    isDisabled,
    buttonText,
    hasWallet,
    onPayAmountChange,
    onTokensChange,
    onMaxClick,
    onSwap,
  } = useSwapCore({ projectId: COBUILD_SWAP_PROJECT_ID });

  const handleConfirmSwap = async (memo?: string) => {
    setIsSwapping(true);
    try {
      await onSwap(memo);
      setShowConfirm(false);
    } catch {
      // User rejected or tx failed - keep dialog open
    } finally {
      setIsSwapping(false);
    }
  };

  // When in dialog mode (hideTitle), show confirm content inline
  if (hideTitle && showConfirm) {
    return (
      <div className={className}>
        <div className="bg-background p-6">
          <ConfirmSwapContent
            payAmount={payAmount}
            userTokens={displayTokens}
            builderTokens={formattedQuote.reservedTokens}
            ethBalanceWei={ethBalance?.value}
            isLoading={isSwapping}
            isSwapDisabled={isDisabled}
            onConfirm={handleConfirmSwap}
            onUserTokensChange={onTokensChange}
            onBack={() => setShowConfirm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className={
          hideTitle
            ? "bg-background p-6"
            : "bg-background/80 border-border rounded-xl border p-6 backdrop-blur-md md:p-8"
        }
      >
        {!hideTitle && (
          <div className="mb-8 flex items-center justify-between">
            <h3 className="text-xl font-bold tracking-tight">Swap</h3>
          </div>
        )}

        <div>
          <div className="space-y-2">
            <label className="text-muted-foreground flex justify-between font-mono text-xs tracking-wider uppercase">
              <span>Pay</span>
              {hasWallet && (
                <button
                  type="button"
                  onClick={onMaxClick}
                  className="hover:text-foreground transition-colors"
                >
                  Balance: {formattedBalance} ETH
                </button>
              )}
            </label>
            <div className="bg-secondary/80 dark:bg-secondary/50 hover:border-border focus-within:border-primary/20 focus-within:ring-primary/20 group flex h-[84px] items-stretch justify-between rounded-lg border border-transparent transition-colors focus-within:ring-1">
              <Input
                type="text"
                inputMode="decimal"
                variant="amount"
                placeholder="0.0"
                value={payAmount}
                onChange={(e) => onPayAmountChange(e.target.value)}
                className="placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center pr-4">
                <EthBadge />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-2 flex justify-center">
            <Button
              variant="outline"
              size="icon"
              className="pointer-events-none rounded-full"
              tabIndex={-1}
            >
              <SwapArrow />
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-muted-foreground font-mono text-xs tracking-wider uppercase">
              Receive
            </label>
            <div className="bg-secondary/80 dark:bg-secondary/50 hover:border-border focus-within:border-primary/20 focus-within:ring-primary/20 group flex h-[84px] items-stretch justify-between rounded-lg border border-transparent transition-colors focus-within:ring-1">
              <Input
                type="text"
                inputMode="decimal"
                variant="amount"
                placeholder="0.0"
                value={isLoadingQuote && payAmount ? "…" : displayTokens}
                onChange={(e) => onTokensChange(e.target.value)}
                className="placeholder:text-muted-foreground/30"
              />
              <div className="my-auto mr-4 flex items-center">
                <CobuildBadge />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <AuthButton
              className="bg-foreground text-background h-auto w-full rounded-lg py-4 text-lg font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
              onClick={() => setShowConfirm(true)}
              disabled={isDisabled}
              connectLabel="Connect Wallet"
            >
              {buttonText}
            </AuthButton>
          </div>
        </div>
      </div>

      {/* Only show dialog when not in dialog mode */}
      {!hideTitle && (
        <ConfirmSwapDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          payAmount={payAmount}
          userTokens={displayTokens}
          builderTokens={formattedQuote.reservedTokens}
          ethBalanceWei={ethBalance?.value}
          isLoading={isSwapping}
          isSwapDisabled={isDisabled}
          onConfirm={handleConfirmSwap}
          onUserTokensChange={onTokensChange}
        />
      )}
    </div>
  );
}
