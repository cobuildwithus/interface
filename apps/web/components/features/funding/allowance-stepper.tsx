"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAccount, usePublicClient } from "wagmi";
import { base } from "viem/chains";
import { Check, Wallet } from "lucide-react";
import { CopyToClipboard } from "@/components/ui/copy-to-clipboard";
import { cn, truncateAddress } from "@/lib/shared/utils";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { useUsdcBudget } from "@/lib/hooks/use-usdc-budget";
import { useUsdcBalance } from "@/lib/hooks/use-usdc-balance";
import { useSignUsdcPermit } from "@/lib/hooks/use-usdc-permit";
import { usdc } from "@/lib/domains/token/usdc";
import { AmountInput } from "@/components/features/funding/amount-input";
import { FundWithCoinbase } from "@/components/features/funding/fund-with-coinbase";
import { PRESET_AMOUNTS } from "./allowance-stepper/constants";
import { parseUsdcAmount } from "./allowance-stepper/utils";
import { RevokeAllowanceCard } from "./allowance-stepper/revoke-card";
type AllowanceStepperProps = {
  initialAddress?: `0x${string}` | null;
  initialUsdcBalance?: string | null;
  initialBalanceUsd?: string | null;
};

export function AllowanceStepper({
  initialAddress = null,
  initialUsdcBalance = null,
  initialBalanceUsd = null,
}: AllowanceStepperProps) {
  const { address } = useAccount();
  const router = useRouter();
  const publicClient = usePublicClient({ chainId: base.id });
  const { allowance, loading: allowanceLoading, refetch: refetchAllowance } = useUsdcBudget();
  const { usdcBalance, balanceUsd, loading: balanceLoading } = useUsdcBalance();
  const { signPermit } = useSignUsdcPermit();

  const [amountInput, setAmountInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasAllowance = allowance !== null && allowance > 0n;
  const hasConnectedAddress = Boolean(address);
  const initialMatches = Boolean(
    address && initialAddress && address.toLowerCase() === initialAddress.toLowerCase()
  );
  const canUseInitial = !hasConnectedAddress && Boolean(initialAddress);
  const initialBalance = initialUsdcBalance ? BigInt(initialUsdcBalance) : null;
  const displayUsdcBalance =
    usdcBalance ?? (initialMatches || canUseInitial ? initialBalance : null);
  const displayBalanceUsd =
    balanceUsd ?? (initialMatches || canUseInitial ? initialBalanceUsd : null);
  const balanceDisplay = displayBalanceUsd ?? "0";
  const effectiveBalanceLoading = balanceLoading && displayUsdcBalance === null;
  const hasUsdc = displayUsdcBalance !== null && displayUsdcBalance > 0n;
  const displayAddress = address ?? initialAddress ?? null;

  useEffect(() => {
    if (amountInput !== "") return;
    if (!allowance || allowance <= 0n) return;
    setAmountInput(usdc.format(allowance));
  }, [allowance, amountInput]);

  const parsedAmount = parseUsdcAmount(amountInput);

  const approveDisabled =
    submitting || !parsedAmount || (allowance !== null && parsedAmount === allowance);

  const handleApprove = async () => {
    setError(null);
    if (!address) {
      setError("Wallet not connected");
      return;
    }
    if (!parsedAmount) {
      setError("Enter an amount to approve");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signPermit({
        spender: contracts.CobuildSwap,
        value: parsedAmount,
        owner: address,
      });

      if (result.serverTxHash && publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: result.serverTxHash });
      }

      await refetchAllowance();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to approve allowance.";
      if (!msg.toLowerCase().includes("rejected")) {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // No USDC balance - show funding section
  if (!hasUsdc) {
    return (
      <div className="border-border/60 bg-card rounded-xl border">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium">Fund your wallet</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Add USDC to your wallet on Base to get started
              </p>
            </div>
            <div className="text-xl font-semibold tracking-tight tabular-nums">
              {effectiveBalanceLoading ? (
                <span className="text-muted-foreground">...</span>
              ) : (
                `$${balanceDisplay}`
              )}
            </div>
          </div>

          <div className="border-border/40 mt-5 border-t pt-5">
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              {/* Fund directly */}
              <div className="flex flex-col">
                <div className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
                  <Wallet className="text-muted-foreground h-4 w-4" />
                  Fund directly
                </div>
                <div className="border-border/60 bg-muted/20 flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center">
                  <p className="text-muted-foreground text-sm">Send USDC on Base</p>
                  {displayAddress && (
                    <CopyToClipboard
                      text={displayAddress}
                      className="bg-background hover:bg-muted mt-3 inline-block cursor-pointer rounded px-3 py-1.5 font-mono text-sm transition-colors"
                    >
                      {truncateAddress(displayAddress)}
                    </CopyToClipboard>
                  )}

                  <div className="my-4 flex w-full items-center gap-3">
                    <div className="bg-border/60 h-px flex-1" />
                    <span className="text-muted-foreground text-xs">OR</span>
                    <div className="bg-border/60 h-px flex-1" />
                  </div>

                  <p className="text-muted-foreground text-sm">Swap for USDC</p>
                  <a
                    href="https://app.uniswap.org/swap?outputCurrency=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913&chain=base"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border/60 bg-background hover:bg-muted mt-3 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
                  >
                    <Image
                      src="/uniswap.svg"
                      alt="Uniswap"
                      width={20}
                      height={20}
                      className="h-5 w-5"
                    />
                    Open Uniswap
                  </a>
                </div>
              </div>

              {/* Buy with card */}
              <FundWithCoinbase />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Has USDC - show budget section
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-xl border transition-all duration-300",
          hasAllowance
            ? "dark:to-background border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white dark:border-emerald-900/50 dark:from-emerald-950/30"
            : "border-border/60 bg-card"
        )}
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {hasAllowance && (
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                </div>
              )}
              <div>
                <h3 className="leading-none font-medium">
                  {hasAllowance ? "Budget set" : "Budget"}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Automatically micro-buy tokens when you like posts
                </p>
              </div>
            </div>
            <div className="text-right">
              <div
                className={cn(
                  "text-xl font-semibold tracking-tight tabular-nums",
                  hasAllowance && "text-emerald-600 dark:text-emerald-400"
                )}
              >
                ${hasAllowance ? usdc.format(allowance) : balanceDisplay}
              </div>
              <div className="text-muted-foreground/70 text-[11px] font-medium">USDC</div>
            </div>
          </div>

          <div className="mt-5">
            <AmountInput
              value={amountInput}
              onChange={setAmountInput}
              onSubmit={handleApprove}
              quickAmounts={PRESET_AMOUNTS}
              maxAmount={displayUsdcBalance ? usdc.format(displayUsdcBalance) : undefined}
              submitLabel={submitting ? "Saving..." : hasAllowance ? "Update" : "Set budget"}
              disabled={approveDisabled}
              submitting={submitting}
              error={error}
            />

            {hasAllowance && (
              <RevokeAllowanceCard
                allowance={allowance}
                loading={allowanceLoading}
                onRevoked={() => {
                  refetchAllowance();
                  router.refresh();
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
