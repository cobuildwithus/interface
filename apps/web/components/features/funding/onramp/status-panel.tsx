"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useOnrampStatus } from "@/lib/hooks/use-onramp-status";
import { cn } from "@/lib/shared/utils";

function explorerFor(network?: string) {
  const n = (network || "").toLowerCase();
  if (n === "base") return (h: string) => `https://basescan.org/tx/${h}`;
  if (n === "ethereum" || n === "eth") return (h: string) => `https://etherscan.io/tx/${h}`;
  return (h: string) => `https://basescan.org/tx/${h}`;
}

export function OnrampStatusPanel({ className }: { className?: string }) {
  const { tx, state } = useOnrampStatus();

  const makeUrl = useMemo(() => explorerFor(tx?.purchase_network), [tx?.purchase_network]);

  return (
    <div
      className={cn(
        "border-border/60 bg-background/70 rounded-2xl border p-5 shadow-sm",
        className
      )}
    >
      {(state === "polling" || state === "idle") && (
        <div className="flex items-start gap-3">
          <span className="mt-1 h-4 w-4 animate-spin rounded-full border-2 border-sky-300 border-t-transparent" />
          <div>
            <div className="font-medium">Waiting for confirmation…</div>
            <div className="text-muted-foreground text-xs">
              Complete checkout in the Coinbase tab. This page updates automatically.
            </div>
          </div>
        </div>
      )}

      {state === "success" && (
        <div className="space-y-2">
          <div className="font-medium">Funds sent to your wallet 🎉</div>
          {tx?.tx_hash ? (
            <div className="text-xs">
              Onchain tx:{" "}
              <Link
                href={makeUrl(tx.tx_hash)}
                className="underline"
                target="_blank"
                rel="noreferrer"
              >
                {tx.tx_hash.slice(0, 10)}…{tx.tx_hash.slice(-8)}
              </Link>
            </div>
          ) : null}
          <div className="text-muted-foreground text-xs">
            {tx?.purchase_amount} {tx?.purchase_currency} on {tx?.purchase_network}
          </div>
        </div>
      )}

      {state === "failed" && (
        <div className="text-sm text-red-500">
          Purchase failed. Please try again or use a different payment method.
        </div>
      )}

      {state === "timeout" && (
        <div className="text-muted-foreground text-sm">
          Still processing. You can close this and we’ll refresh when the status updates.
        </div>
      )}

      {state === "unauthorized" && (
        <div className="text-muted-foreground text-sm">Sign in to view your funding status.</div>
      )}
    </div>
  );
}
