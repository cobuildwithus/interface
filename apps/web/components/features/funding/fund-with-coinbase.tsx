"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useAccount } from "wagmi";
import { CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AmountInput } from "@/components/features/funding/amount-input";
import { createOnrampUrlAction } from "@/app/(app)/actions/onramp-url";
import { cn } from "@/lib/shared/utils";

const QUICK_AMOUNTS = [5, 25, 250] as const;
const MIN_FIAT_AMOUNT = 2;

type FundWithCoinbaseProps = {
  className?: string;
};

export function FundWithCoinbase({ className }: FundWithCoinbaseProps) {
  const { address } = useAccount();
  const [amountInput, setAmountInput] = useState("25");
  const [busy, setBusy] = useState(false);
  const [showStatusLink, setShowStatusLink] = useState(false);

  const amountValue = parseFiatAmount(amountInput);
  const isAmountValid = amountValue !== null && amountValue >= MIN_FIAT_AMOUNT;

  const handleOnramp = useCallback(async () => {
    if (!address) return;
    if (!isAmountValid || amountValue === null) {
      toast.error(`Minimum amount is $${MIN_FIAT_AMOUNT}`);
      return;
    }

    setBusy(true);
    try {
      const result = await createOnrampUrlAction({
        address,
        presetFiatAmount: amountValue,
        fiatCurrency: "USD",
      });

      if (!result.ok) {
        toast.error(result.error ?? "Failed to create onramp URL");
        return;
      }

      if (result.url) {
        setShowStatusLink(true);
        const win = window.open(result.url, "_blank", "noopener,noreferrer");
        if (!win) {
          toast.error("Pop-up blocked. Please allow pop-ups and try again.");
        }
      } else {
        toast.error("Failed to create onramp URL");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Network request failed");
    } finally {
      setBusy(false);
    }
  }, [address, amountValue, isAmountValid]);

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header */}
      <div className="text-foreground mb-4 flex items-center gap-2 text-sm font-medium">
        <CreditCard className="text-muted-foreground h-4 w-4" />
        Fund with card
      </div>

      <AmountInput
        className="flex-1"
        value={amountInput}
        onChange={setAmountInput}
        onSubmit={handleOnramp}
        quickAmounts={QUICK_AMOUNTS}
        submitLabel={busy ? "Opening..." : "Pay"}
        disabled={!isAmountValid}
        submitting={busy}
        buttonPosition="below"
      />

      {showStatusLink && (
        <Link
          href="/onramp-return"
          className="text-muted-foreground/70 hover:text-muted-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          Check payment status
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      )}
    </div>
  );
}

function parseFiatAmount(input: string): number | null {
  if (!input) return null;
  const value = Number.parseFloat(input);
  if (!Number.isFinite(value)) return null;
  return value;
}
