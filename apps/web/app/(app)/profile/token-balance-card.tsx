import Link from "next/link";
import { Coins, Wallet } from "lucide-react";
import { Currency } from "@/components/ui/currency";
import { getProfileTokenBalanceData } from "./profile-data";

function formatTokenAmount(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1 ? 2 : 6,
  }).format(value);
}

export async function TokenBalanceCard() {
  const { isConnected, tokenSymbol, tokenBalance, cashOutValueUsd } =
    await getProfileTokenBalanceData();

  if (!isConnected) {
    return (
      <div className="border-border bg-card/50 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              Your Balance
            </div>
            <div className="mt-1 text-2xl font-semibold">0 {tokenSymbol}</div>
            <div className="text-muted-foreground text-sm">$0.00</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Wallet className="text-muted-foreground/30 size-8" />
            <Link href="/settings" className="text-primary text-xs font-medium hover:underline">
              Connect wallet
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-card/50 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-muted-foreground text-xs tracking-wide uppercase">Your Balance</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatTokenAmount(tokenBalance)} {tokenSymbol}
          </div>
          <div className="text-muted-foreground text-sm">
            <Currency value={cashOutValueUsd} kind="usd" compact />
          </div>
          <div className="text-muted-foreground mt-1 text-xs">Estimated cash-out value</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Coins className="text-muted-foreground/30 size-8" />
          {tokenBalance <= 0 ? (
            <Link href="/goals" className="text-primary text-xs font-medium hover:underline">
              Fund a goal
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
