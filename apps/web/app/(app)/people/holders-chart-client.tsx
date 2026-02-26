"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  useRechartsReady,
  XAxis,
  YAxis,
} from "@/components/common/charts/recharts";
import { useRafMounted } from "@/components/common/charts/use-raf-mounted";
import type { ChartTooltipProps } from "@/components/common/charts/types";
import { HoldersChartSkeleton } from "@/components/common/skeletons/holders-chart-skeleton";
import { formatTokenAmount } from "@/lib/shared/currency/format";
import type { HoldersDataPoint } from "@/lib/domains/token/juicebox/holders-history";

type Props = {
  data: HoldersDataPoint[];
  symbol: string;
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function HoldersChartClient({ data, symbol }: Props) {
  const mounted = useRafMounted();
  const rechartsReady = useRechartsReady();

  if (!mounted || !rechartsReady) {
    return <HoldersChartSkeleton />;
  }

  if (data.length === 0) {
    return null;
  }

  const currentHolders = data[data.length - 1]?.holders ?? 0;
  const currentMedian = data[data.length - 1]?.medianContribution ?? 0;

  // Sample data points for x-axis labels (show ~4 labels max)
  const step = Math.max(1, Math.floor(data.length / 4));
  const tickIndices = data.map((_, i) => i).filter((i) => i % step === 0 || i === data.length - 1);

  return (
    <div
      className="bg-muted/30 col-span-full row-span-3 flex min-h-[280px] flex-col rounded-xl border p-5 outline-none sm:col-span-2"
      tabIndex={-1}
    >
      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <div className="size-2 rounded-full bg-violet-500" />
            Holders
          </div>
          <div className="text-lg font-semibold">{currentHolders.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <div className="size-2 rounded-full bg-emerald-500" />
            Median Contribution
          </div>
          <div className="text-lg font-semibold">
            {formatTokenAmount(currentMedian)} {symbol}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="holdersGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="avgGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={formatDate}
              ticks={tickIndices.map((i) => data[i]!.timestamp)}
              dy={8}
            />
            <YAxis
              yAxisId="holders"
              orientation="left"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              width={30}
            />
            <YAxis
              yAxisId="avg"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(v: number) => formatTokenAmount(v)}
              width={35}
            />
            <Tooltip
              content={({ active, payload }: ChartTooltipProps<HoldersDataPoint>) => {
                if (!active || !payload?.[0]) return null;
                const point = payload[0].payload as HoldersDataPoint;
                return (
                  <div className="bg-popover rounded-md border px-3 py-2 shadow-md">
                    <div className="text-xs font-medium">{formatDate(point.timestamp)}</div>
                    <div className="mt-1 flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-violet-500" />
                        <span>{point.holders.toLocaleString()} holders</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-emerald-500" />
                        <span>
                          {formatTokenAmount(point.medianContribution)} {symbol} median
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
            <Area
              yAxisId="holders"
              type="monotone"
              dataKey="holders"
              name="Holders"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#holdersGradient)"
              isAnimationActive={false}
            />
            <Area
              yAxisId="avg"
              type="monotone"
              dataKey="medianContribution"
              name="Median"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#avgGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
