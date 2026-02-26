"use client";

import { useState, useCallback, useMemo } from "react";
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
import { Currency } from "@/components/ui/currency";
import { TreasuryChartSkeleton } from "@/components/common/skeletons/treasury-chart-skeleton";
import {
  TimeRangeFilter,
  TREASURY_RANGE_OPTIONS,
  filterDataByTimeRange,
  type TimeRangeOption,
} from "@/components/ui/time-range-filter";
import { formatTokenAmount, formatTokenAmountFull } from "@/lib/shared/currency/format";
import type { TreasuryDataPoint } from "@/lib/domains/token/juicebox/treasury-history";

type Props = {
  data: TreasuryDataPoint[];
  symbol: string;
};

function appendNowPoint(data: TreasuryDataPoint[], enabled: boolean): TreasuryDataPoint[] {
  if (!enabled || data.length === 0) return data;
  const lastPoint = data[data.length - 1]!;
  const now = Date.now();
  return now > lastPoint.timestamp ? [...data, { ...lastPoint, timestamp: now }] : data;
}

function formatDate(timestamp: number, rangeHours: number | null): string {
  const date = new Date(timestamp);
  // For hour ranges, show time
  if (rangeHours !== null && rangeHours <= 24) {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  // For week or less, show day
  if (rangeHours !== null && rangeHours <= 24 * 7) {
    return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  }
  // Default: month and day
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TreasuryChartClient({ data, symbol }: Props) {
  const mounted = useRafMounted();
  const rechartsReady = useRechartsReady();
  const [range, setRange] = useState<TimeRangeOption>(() => {
    return (
      TREASURY_RANGE_OPTIONS.find((option) => option.label === "1W") ??
      TREASURY_RANGE_OPTIONS[TREASURY_RANGE_OPTIONS.length - 1]!
    );
  });

  const dataWithNow = useMemo(() => appendNowPoint(data, mounted), [data, mounted]);

  const filteredData = useMemo(
    () => filterDataByTimeRange(dataWithNow, range),
    [dataWithNow, range]
  );

  // Calculate dynamic y-axis domain based on filtered data
  const yDomain = useMemo(() => {
    if (filteredData.length === 0) return [0, 0];
    const balances = filteredData.map((d) => d.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    // Add 10% padding above and below, but don't go below 0
    const padding = (max - min) * 0.1 || max * 0.1;
    return [Math.max(0, min - padding), max + padding];
  }, [filteredData]);

  const formatBalanceWithSymbol = useCallback(
    (value: number) => `${formatTokenAmountFull(value)} ${symbol}`,
    [symbol]
  );

  if (data.length === 0) {
    return null;
  }
  if (!mounted || !rechartsReady) {
    return <TreasuryChartSkeleton />;
  }

  const currentBalance = dataWithNow[dataWithNow.length - 1]?.balance ?? 0;
  const dataStartTime = dataWithNow[0]?.timestamp;
  const dataEndTime = dataWithNow[dataWithNow.length - 1]?.timestamp;

  // Sample data points for x-axis labels (show ~5 labels max)
  const step = Math.max(1, Math.floor(filteredData.length / 5));
  const tickIndices = filteredData
    .map((_, i) => i)
    .filter((i) => i % step === 0 || i === filteredData.length - 1);

  return (
    <div className="w-full rounded-xl border p-5 outline-none" tabIndex={-1}>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-lg font-semibold tracking-tight">
          <Currency value={currentBalance} kind="token" /> {symbol}
        </div>
        <TimeRangeFilter
          options={TREASURY_RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          dataStartTime={dataStartTime}
          dataEndTime={dataEndTime}
        />
      </div>

      <div className="mt-4 h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="treasuryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(ts: number) => formatDate(ts, range.hours)}
              ticks={tickIndices.map((i) => filteredData[i]!.timestamp)}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(v: number) => formatTokenAmount(v)}
              width={50}
              domain={yDomain}
            />
            <Tooltip
              content={({ active, payload }: ChartTooltipProps<TreasuryDataPoint>) => {
                if (!active || !payload?.[0]) return null;
                const point = payload[0].payload as TreasuryDataPoint;
                const isHourRange = range.hours !== null && range.hours <= 24;
                return (
                  <div className="bg-popover rounded-md border px-3 py-2 shadow-md">
                    <div className="text-muted-foreground text-xs">
                      {new Date(point.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        ...(isHourRange && { hour: "numeric", minute: "2-digit" }),
                      })}
                    </div>
                    <div className="text-sm font-semibold text-emerald-500">
                      {formatBalanceWithSymbol(point.balance)}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#treasuryGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
