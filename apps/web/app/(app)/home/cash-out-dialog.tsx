"use client";

import { PropsWithChildren, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatUnits, parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { AuthButton } from "@/components/ui/auth-button";
import { Currency } from "@/components/ui/currency";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useRevnetPosition } from "@/lib/hooks/use-revnet-position";
import { jbMultiTerminalAbi, jbTerminalStoreAbi } from "@/lib/domains/token/onchain/abis";
import { contracts } from "@/lib/domains/token/onchain/addresses";
import { REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";
import { applyJbDaoCashoutFee, applyRevnetCashoutFee } from "@/lib/domains/token/juicebox/fees";
import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";

type RevnetPosition = ReturnType<typeof useRevnetPosition>;

function formatDisplay(value: string, digits = 4) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(numberValue);
}

function safeParseUnits(value: string, decimals: number) {
  if (!value) return 0n;
  try {
    return parseUnits(value, decimals);
  } catch {
    return 0n;
  }
}

function RevnetTokenBadge({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const fallback = symbol.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="bg-background border-border flex items-center gap-2 rounded border px-2 py-1">
      {logoUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={logoUrl} alt={symbol} className="size-4 shrink-0 rounded-full" />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold">
          {fallback}
        </span>
      )}
      <span className="text-sm font-bold">{symbol}</span>
    </div>
  );
}

export function CashOutDialog({
  position,
  tokenLogoUrl,
  children,
}: PropsWithChildren<{ position: RevnetPosition; tokenLogoUrl?: string | null }>) {
  const [amount, setAmount] = useState("");

  const maxAmount = useMemo(() => {
    return formatUnits(position.tokenBalance, position.tokenDecimals);
  }, [position.tokenBalance, position.tokenDecimals]);
  const maxAmountDisplay = useMemo(() => formatDisplay(maxAmount), [maxAmount]);
  const canFillMax = position.isConnected && position.tokenBalance > 0n;
  const balanceLabel = position.isConnected
    ? `Balance: ${maxAmountDisplay} ${position.tokenSymbol}`
    : "Connect wallet";

  const cashOutCount = useMemo(
    () => safeParseUnits(amount, position.tokenDecimals),
    [amount, position.tokenDecimals]
  );

  const netCashOutCount = useMemo(() => applyRevnetCashoutFee(cashOutCount), [cashOutCount]);

  const hasEnoughBalance = cashOutCount > 0n && cashOutCount <= position.tokenBalance;

  const { data: cashOutQuote } = useReadContract({
    address: contracts.JBTerminalStore as `0x${string}`,
    abi: jbTerminalStoreAbi,
    functionName: "currentReclaimableSurplusOf",
    args:
      position.baseTokenContext && position.terminalAddress && cashOutCount > 0n
        ? [
            position.projectId,
            netCashOutCount,
            [position.terminalAddress],
            [position.baseTokenContext],
            BigInt(position.baseTokenContext.decimals),
            BigInt(position.baseTokenContext.currency),
          ]
        : undefined,
    chainId: REVNET_CHAIN_ID,
    query: {
      enabled: !!position.baseTokenContext && !!position.terminalAddress && cashOutCount > 0n,
    },
  });

  const netQuote = applyJbDaoCashoutFee(cashOutQuote ?? 0n);
  const quoteValue = position.baseTokenContext
    ? Number(formatUnits(netQuote, position.baseTokenContext.decimals))
    : 0;

  const cashOutTx = useContractTransaction({
    chainId: REVNET_CHAIN_ID,
    loading: "Cash out in progress...",
    success: "Cash out confirmed",
  });

  const handleCashOut = async () => {
    let toastId: string | number | undefined;
    try {
      toastId = await cashOutTx.prepareWallet();

      if (!position.account) {
        throw new Error("Wallet not connected");
      }

      if (!position.terminalAddress || !position.baseTokenContext) {
        throw new Error("Cash out not available for this project");
      }

      if (!hasEnoughBalance) {
        throw new Error("Invalid cash out amount");
      }

      await cashOutTx.writeContractAsync({
        address: position.terminalAddress,
        abi: jbMultiTerminalAbi,
        functionName: "cashOutTokensOf",
        args: [
          position.account,
          position.projectId,
          cashOutCount,
          position.baseTokenContext.token,
          0n,
          position.account,
          "0x",
        ],
        chainId: REVNET_CHAIN_ID,
      });
    } catch {
      if (toastId) toast.dismiss(toastId);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cash out</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="bg-secondary/80 dark:bg-secondary/50 hover:border-border focus-within:border-primary/20 focus-within:ring-primary/20 group flex h-[84px] items-stretch justify-between rounded-lg border border-transparent transition-colors focus-within:ring-1">
              <Input
                type="text"
                inputMode="decimal"
                variant="amount"
                placeholder="0.0"
                value={amount}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === "" || /^[0-9]*\.?[0-9]*$/.test(value)) {
                    setAmount(value);
                  }
                }}
                className="placeholder:text-muted-foreground/30"
              />
              <div className="flex items-center pr-4 text-sm font-semibold">
                <RevnetTokenBadge symbol={position.tokenSymbol} logoUrl={tokenLogoUrl} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span
                className={amount && !hasEnoughBalance ? "text-red-500" : "text-transparent"}
                aria-live="polite"
              >
                Insufficient balance
              </span>
              <button
                type="button"
                onClick={() => setAmount(maxAmount)}
                disabled={!canFillMax}
                className="text-muted-foreground hover:text-foreground transition-colors disabled:cursor-default disabled:opacity-60"
              >
                {balanceLabel}
              </button>
            </div>
          </div>

          <AuthButton
            onClick={handleCashOut}
            disabled={!hasEnoughBalance || cashOutTx.isLoading}
            className="bg-foreground text-background h-auto w-full rounded-lg py-4 text-lg font-bold shadow-sm transition-all hover:opacity-90 active:scale-[0.99]"
            connectLabel="Connect wallet"
          >
            {cashOutTx.isLoading ? "Processing..." : "Cash out"}
          </AuthButton>

          <div className="text-muted-foreground flex items-center justify-between text-sm">
            <span>You receive</span>
            <span className="text-foreground font-medium">
              <Currency value={quoteValue} kind="token" /> {position.baseTokenSymbol}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
