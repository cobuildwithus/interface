"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/common/charts/recharts";
import type { ChartTooltipProps } from "@/components/common/charts/types";
import { useRafMounted } from "@/components/common/charts/use-raf-mounted";
import { formatTokenAmount } from "@/lib/shared/currency/format";
import type { SupplyBalanceHistory } from "@/lib/domains/token/juicebox/issuance-supply-balance-history";

type SupplyBalancePoint = SupplyBalanceHistory["data"][number];
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function IssuanceSupplyBalanceChartClient({
  data,
  baseSymbol,
  tokenSymbol,
}: SupplyBalanceHistory) {
  const mounted = useRafMounted();

  const latest = data[data.length - 1];

  const tickIndices = useMemo(() => {
    const step = Math.max(1, Math.floor(data.length / 6));
    return data.map((_, i) => i).filter((i) => i % step === 0 || i === data.length - 1);
  }, [data]);

  if (!mounted || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-muted/30 w-full rounded-xl border p-5">
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <div className="size-2 rounded-full bg-blue-500" />
            Total supply
          </div>
          <div className="text-lg font-semibold">
            {formatTokenAmount(latest?.totalSupply ?? 0)} {tokenSymbol}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <div className="size-2 rounded-full bg-emerald-500" />
            Total balance
          </div>
          <div className="text-lg font-semibold">
            {formatTokenAmount(latest?.totalBalance ?? 0)} {baseSymbol}
          </div>
        </div>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="supplyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(value: number) => formatDate(value)}
              ticks={tickIndices.map((i) => data[i]!.timestamp)}
              dy={8}
            />
            <YAxis
              yAxisId="supply"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(value: number) => formatTokenAmount(value)}
              width={40}
            />
            <YAxis
              yAxisId="balance"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(value: number) => formatTokenAmount(value)}
              width={40}
            />
            <Tooltip
              content={({ active, payload }: ChartTooltipProps<SupplyBalancePoint>) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as SupplyBalancePoint;
                return (
                  <div className="bg-popover rounded-md border px-3 py-2 shadow-md">
                    <div className="text-xs font-medium">{formatDate(point.timestamp)}</div>
                    <div className="mt-1 flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-blue-500" />
                        <span>
                          {formatTokenAmount(point.totalSupply)} {tokenSymbol}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500" />
                        <span>
                          {formatTokenAmount(point.totalBalance)} {baseSymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              yAxisId="supply"
              type="monotone"
              dataKey="totalSupply"
              name="Total supply"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#supplyGradient)"
              isAnimationActive={false}
            />
            <Area
              yAxisId="balance"
              type="monotone"
              dataKey="totalBalance"
              name="Total balance"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#balanceGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
