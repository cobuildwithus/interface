"use client";

import { type PropsWithChildren } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { AuthButton } from "@/components/ui/auth-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LOAN_LIQUIDATION_YEARS, REPAY_OPTIONS } from "./loan-dialog/constants";
import { RevnetTokenBadge } from "./loan-dialog/token-badge";
import { useLoanDialogState } from "./loan-dialog/state";
import type { RevnetPosition } from "./loan-dialog/types";

export function LoanDialog({
  position,
  tokenLogoUrl,
  children,
}: PropsWithChildren<{ position: RevnetPosition; tokenLogoUrl?: string | null }>) {
  const {
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
  } = useLoanDialogState(position);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take a loan</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="bg-secondary/80 dark:bg-secondary/50 hover:border-border focus-within:border-primary/20 focus-within:ring-primary/20 group flex h-[84px] items-stretch justify-between rounded-lg border border-transparent transition-colors focus-within:ring-1">
              <Input
                type="text"
                inputMode="decimal"
                variant="amount"
                placeholder="0.0"
                value={collateralAmount}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                    setCollateralAmount(value);
                  }
                }}
                className="placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center pr-4 text-sm font-semibold">
                <RevnetTokenBadge symbol={position.tokenSymbol} logoUrl={tokenLogoUrl} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p
                className={`mr-auto text-left text-xs text-red-500 transition-opacity ${
                  collateralAmount && !isCollateralValid ? "opacity-100" : "opacity-0"
                }`}
                aria-live="polite"
              >
                Insufficient balance
              </p>
              <button
                type="button"
                onClick={() => setCollateralAmount(maxCollateral)}
                disabled={!canFillMax}
                className="text-muted-foreground hover:text-foreground text-xs transition-colors disabled:cursor-default disabled:opacity-60"
              >
                {balanceLabel}
              </button>
            </div>
          </div>

          <AuthButton
            onClick={handleBorrow}
            disabled={!isCollateralValid || isProcessing}
            className="bg-foreground text-background h-auto w-full rounded-lg py-4 text-lg font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            connectLabel="Connect wallet"
          >
            {buttonLabel}
          </AuthButton>

          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>You receive now</span>
            <span className="text-foreground font-medium">
              {borrowDisplay} {baseTokenSymbol}
            </span>
          </div>

          <details className="group text-sm">
            <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 text-xs transition-colors [&::-webkit-details-marker]:hidden">
              <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              Advanced options
            </summary>
            <div className="mt-5 space-y-5">
              <div className="space-y-3">
                <label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  Expected repayment window
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground/60 size-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Choose when you expect to repay. Longer windows have higher upfront fees but
                      no late penalties.
                    </TooltipContent>
                  </Tooltip>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {REPAY_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => setRepayYears(option.years)}
                      className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${
                        repayYears === option.years
                          ? "border-foreground/30 bg-foreground/10 text-foreground"
                          : "border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-muted-foreground space-y-4 text-xs">
                <p className="flex items-center gap-1.5">
                  Upfront fee: {prepaidPercentLabel}% prepaid + {revFeePercentLabel}% REV fee
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="text-muted-foreground/60 size-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      Fees are deducted from your loan amount. REV fee goes to the protocol.
                    </TooltipContent>
                  </Tooltip>
                </p>
                <div className="bg-muted/40 border-border space-y-2.5 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <span>Loan principal</span>
                    <span className="text-foreground font-medium">
                      {principalDisplay} {baseTokenSymbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Upfront fees</span>
                    <span className="text-foreground font-medium">
                      -{upfrontFeeDisplay} {baseTokenSymbol}
                    </span>
                  </div>
                  <div className="border-border flex items-center justify-between border-t pt-2.5">
                    <span className="font-medium">You receive now</span>
                    <span className="text-foreground font-medium">
                      {borrowDisplay} {baseTokenSymbol}
                    </span>
                  </div>
                </div>
                <div className="bg-muted/20 text-muted-foreground space-y-1 rounded-md p-3">
                  <p className="flex items-center gap-1.5">
                    No APR. Fees are upfront + a late fee after {repayWindowLabel}.
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="text-muted-foreground/60 size-3 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Unlike traditional loans, there&apos;s no ongoing interest. You only pay
                        more if you repay late.
                      </TooltipContent>
                    </Tooltip>
                  </p>
                  {hasFullPrepayCoverage ? (
                    <p>Late fee: none (prepaid through year {LOAN_LIQUIDATION_YEARS}).</p>
                  ) : (
                    <p>
                      Max repay at year {LOAN_LIQUIDATION_YEARS}: {maxRepayDisplay}{" "}
                      {baseTokenSymbol}
                      to get back {collateralDisplay} {position.tokenSymbol}.
                    </p>
                  )}
                </div>
                <p className="text-muted-foreground/80">{feeWindowNote}</p>
              </div>
            </div>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
