"use client";

import Link from "next/link";
import { Coins } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  useRechartsReady,
} from "@/components/common/charts/recharts";
import { useRafMounted } from "@/components/common/charts/use-raf-mounted";
import { Currency } from "@/components/ui/currency";

type BalanceDataPoint = {
  timestamp: number;
  balance: number;
};

// Fake balance history data showing growth over time
const FAKE_BALANCE_HISTORY: BalanceDataPoint[] = [
  { timestamp: Date.now() - 90 * 24 * 60 * 60 * 1000, balance: 1200 },
  { timestamp: Date.now() - 75 * 24 * 60 * 60 * 1000, balance: 2800 },
  { timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, balance: 3100 },
  { timestamp: Date.now() - 45 * 24 * 60 * 60 * 1000, balance: 4500 },
  { timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000, balance: 4200 },
  { timestamp: Date.now() - 15 * 24 * 60 * 60 * 1000, balance: 5100 },
  { timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000, balance: 5400 },
  { timestamp: Date.now(), balance: 5915 },
];

const FAKE_TOKEN_BALANCE = 124500;
const TOKEN_SYMBOL = "COBUILD";

type TokenBalanceCardProps = {
  isEmpty?: boolean;
};

export function TokenBalanceCard({ isEmpty = false }: TokenBalanceCardProps) {
  const mounted = useRafMounted();
  const rechartsReady = useRechartsReady();

  const data = FAKE_BALANCE_HISTORY;
  const currentBalance = data[data.length - 1]?.balance ?? 0;

  // Zero state
  if (isEmpty) {
    return (
      <div className="border-border bg-card/50 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              Your Balance
            </div>
            <div className="mt-1 text-2xl font-semibold">0 {TOKEN_SYMBOL}</div>
            <div className="text-muted-foreground text-sm">$0.00</div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Coins className="text-muted-foreground/30 size-8" />
            <Link href="/token" className="text-primary text-xs font-medium hover:underline">
              Get tokens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (!mounted || !rechartsReady) {
    return (
      <div className="border-border bg-card/50 rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-muted-foreground text-xs tracking-wide uppercase">
              Your Balance
            </div>
            <div className="mt-1 text-2xl font-semibold">
              {FAKE_TOKEN_BALANCE.toLocaleString()} {TOKEN_SYMBOL}
            </div>
            <div className="text-muted-foreground text-sm">
              <Currency value={currentBalance} kind="usd" compact />
            </div>
          </div>
          <div className="bg-muted/30 h-12 w-24 animate-pulse rounded" />
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
            {FAKE_TOKEN_BALANCE.toLocaleString()} {TOKEN_SYMBOL}
          </div>
          <div className="text-muted-foreground text-sm">
            <Currency value={currentBalance} kind="usd" compact />
          </div>
        </div>
        <div className="h-12 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#22c55e"
                strokeWidth={1.5}
                fill="url(#balanceGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
