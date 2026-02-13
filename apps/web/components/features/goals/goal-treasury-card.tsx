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

// Generate sample data with both inflows and outflows
function generateSampleData(): FlowDataPoint[] {
  const now = Date.now();
  const points: FlowDataPoint[] = [];
  let balance = 45000; // Starting balance

  // Generate ~90 days of data
  for (let i = 90; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const dayOfWeek = new Date(timestamp).getDay();

    // Simulate realistic treasury activity
    let inflow = 0;
    let outflow = 0;

    // Inflows: contributions come in waves
    if (Math.random() > 0.6) {
      inflow = Math.floor(Math.random() * 3000) + 500;
    }

    // Outflows: payouts happen regularly, bigger on Fridays
    if (Math.random() > 0.7) {
      outflow = Math.floor(Math.random() * 2000) + 200;
      if (dayOfWeek === 5) outflow *= 1.5; // Friday payouts
    }

    balance = balance + inflow - outflow;
    balance = Math.max(balance, 10000); // Floor

    points.push({
      timestamp,
      balance,
      inflow,
      outflow,
    });
  }

  return points;
}

export function GoalTreasuryCard() {
  const [sampleData] = useState<FlowDataPoint[]>(() => generateSampleData());
  const [range, setRange] = useState<TimeRangeOption>(
    GOAL_TREASURY_RANGE_OPTIONS.find((o) => o.label === "1M") ?? GOAL_TREASURY_RANGE_OPTIONS[0]!
  );

  const filteredData = useMemo(() => filterDataByTimeRange(sampleData, range), [sampleData, range]);

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
          dataStartTime={sampleData[0]?.timestamp}
          dataEndTime={sampleData[sampleData.length - 1]?.timestamp}
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
