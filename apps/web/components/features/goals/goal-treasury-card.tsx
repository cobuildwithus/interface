"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "@/components/common/charts/recharts";
import { Currency } from "@/components/ui/currency";
import {
  TimeRangeFilter,
  filterDataByTimeRange,
  type TimeRangeOption,
} from "@/components/ui/time-range-filter";

type FlowDataPoint = {
  timestamp: number;
  balance: number;
  inflow: number;
  outflow: number;
};

type GoalTreasuryTooltipPayload = { payload: FlowDataPoint };
type GoalTreasuryTooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<GoalTreasuryTooltipPayload>;
};

const GOAL_TREASURY_RANGE_OPTIONS: TimeRangeOption[] = [
  { label: "1W", hours: 24 * 7 },
  { label: "1M", hours: 24 * 30 },
  { label: "3M", hours: 24 * 90 },
  { label: "All", hours: null },
];

type GoalTreasuryCardProps = {
  points: FlowDataPoint[];
};

export function GoalTreasuryCard({ points }: GoalTreasuryCardProps) {
  const [range, setRange] = useState<TimeRangeOption>(
    GOAL_TREASURY_RANGE_OPTIONS.find((o) => o.label === "1M") ?? GOAL_TREASURY_RANGE_OPTIONS[0]!
  );

  const filteredData = useMemo(() => filterDataByTimeRange(points, range), [points, range]);

  const { currentBalance, periodInflow, periodOutflow, netChange } = useMemo(() => {
    const current = filteredData[filteredData.length - 1]?.balance ?? 0;
    const startBalance = filteredData[0]?.balance ?? 0;
    const inflow = filteredData.reduce((sum, d) => sum + d.inflow, 0);
    const outflow = filteredData.reduce((sum, d) => sum + d.outflow, 0);
    return {
      currentBalance: current,
      periodInflow: inflow,
      periodOutflow: outflow,
      netChange: current - startBalance,
    };
  }, [filteredData]);

  if (points.length === 0) {
    return (
      <div className="bg-card w-full rounded-xl border p-5">
        <div className="mb-2 text-2xl font-bold">
          <Currency value={0} kind="usd" />
        </div>
        <p className="text-muted-foreground text-sm">No treasury history yet.</p>
      </div>
    );
  }

  // Determine chart color based on net change
  const isPositive = netChange >= 0;
  const netChangeClass = isPositive
    ? "text-green-600 dark:text-green-400"
    : "text-red-500 dark:text-red-400";
  const netChangeSign = isPositive ? "+" : "";
  const chartColor = isPositive ? "#22c55e" : "#ef4444";
  const gradientId = isPositive ? "treasuryGradientUp" : "treasuryGradientDown";

  return (
    <div className="bg-card w-full rounded-xl border p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="text-2xl font-bold">
          <Currency value={currentBalance} kind="usd" />
        </div>
        <TimeRangeFilter
          options={GOAL_TREASURY_RANGE_OPTIONS}
          value={range}
          onChange={setRange}
          dataStartTime={points[0]?.timestamp}
          dataEndTime={points[points.length - 1]?.timestamp}
        />
      </div>

      {/* Flow summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <div className="text-muted-foreground text-xs">Inflows</div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            +<Currency value={periodInflow} kind="usd" compact />
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <div className="text-muted-foreground text-xs">Outflows</div>
          <div className="text-sm font-semibold text-red-500 dark:text-red-400">
            -<Currency value={periodOutflow} kind="usd" compact />
          </div>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <div className="text-muted-foreground text-xs">Net</div>
          <div className={`text-sm font-semibold ${netChangeClass}`}>
            {netChangeSign}
            <Currency value={netChange} kind="usd" compact />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[100px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="treasuryGradientUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="treasuryGradientDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Tooltip
              content={({ active, payload }: GoalTreasuryTooltipProps) => {
                if (!active || !payload?.[0]) return null;
                const point = payload[0].payload as FlowDataPoint;
                return (
                  <div className="bg-popover rounded-md border px-3 py-2 shadow-md">
                    <div className="text-muted-foreground text-xs">
                      {new Date(point.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      <Currency value={point.balance} kind="usd" />
                    </div>
                    {(point.inflow > 0 || point.outflow > 0) && (
                      <div className="mt-1 flex gap-2 text-xs">
                        {point.inflow > 0 && (
                          <span className="text-green-600">+${point.inflow.toLocaleString()}</span>
                        )}
                        {point.outflow > 0 && (
                          <span className="text-red-500">-${point.outflow.toLocaleString()}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={chartColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
