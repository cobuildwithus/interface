"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "@/components/common/charts/recharts";
import type { ChartTooltipProps } from "@/components/common/charts/types";
import { cn } from "@/lib/shared/utils";
import { TimeRangeFilter } from "@/components/ui/time-range-filter";
import type { IssuancePoint, IssuanceSummary } from "@/lib/domains/token/juicebox/issuance-terms";
import { formatPriceValue, toIssuancePrice } from "./issuance-format";
import {
  formatDate,
  getNextChangeMeta,
  getRangeBounds,
  getTickIndices,
  interpolateIssuanceData,
} from "./issuance-chart-helpers";
import { RANGE_OPTIONS, RANGE_TIME_OPTIONS } from "./issuance-chart-client/constants";
import type {
  CashoutDataPoint,
  CombinedDataPoint,
  RangeOption,
} from "./issuance-chart-client/types";
import { buildCombinedData, getDefaultRange, getYDomain } from "./issuance-chart-client/utils";

type IssuanceChartClientProps = {
  data: IssuancePoint[];
  summary: IssuanceSummary;
  baseSymbol: string;
  chartStart: number;
  chartEnd: number;
  now: number;
  cashoutHistory: CashoutDataPoint[];
};

export function IssuanceChartClient({
  data,
  summary,
  baseSymbol,
  chartStart,
  chartEnd,
  now,
  cashoutHistory,
}: IssuanceChartClientProps) {
  const [range, setRange] = useState<RangeOption>(() => getDefaultRange(chartStart, now));
  const rangeByLabel = useMemo(
    () => new Map(RANGE_OPTIONS.map((option) => [option.label, option])),
    []
  );

  const currentFloorPrice = cashoutHistory[cashoutHistory.length - 1]?.cashOutValue ?? null;

  const rangeBounds = useMemo(
    () => getRangeBounds({ chartStart, chartEnd, rangeYears: range.years, now }),
    [chartStart, chartEnd, range.years, now]
  );

  const displayData = useMemo(
    () => interpolateIssuanceData({ data, rangeBounds }),
    [data, rangeBounds]
  );

  const combinedData = useMemo(
    () =>
      buildCombinedData({
        displayData,
        cashoutHistory,
        rangeBounds,
        now,
      }),
    [displayData, cashoutHistory, rangeBounds, now]
  );

  const tickIndices = useMemo(() => getTickIndices(combinedData), [combinedData]);

  const nextChange = useMemo(
    () => getNextChangeMeta({ summary, now, baseSymbol }),
    [summary, now, baseSymbol]
  );

  const yDomain = useMemo(() => getYDomain(combinedData), [combinedData]);

  return (
    <div className="bg-muted/30 w-full rounded-xl border p-5">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
            <div>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <div className="size-2 rounded-full bg-emerald-500" />
                Issuance price
              </div>
              <div className="text-xl font-semibold md:text-2xl">
                {`${formatPriceValue(toIssuancePrice(summary.currentIssuance))} ${baseSymbol}`}
              </div>
            </div>
            {currentFloorPrice !== null && (
              <div>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <div className="size-2 rounded-full bg-sky-500" />
                  Floor price
                </div>
                <div className="text-xl font-semibold md:text-2xl">
                  {`${formatPriceValue(currentFloorPrice)} ${baseSymbol}`}
                </div>
              </div>
            )}
          </div>
          {nextChange && (
            <div className="text-muted-foreground text-sm">
              {nextChange.prefix} {nextChange.priceLabel} in {nextChange.timeRemaining}
            </div>
          )}
        </div>
        <div className="flex items-center self-end md:self-auto">
          <TimeRangeFilter
            options={RANGE_TIME_OPTIONS}
            value={{ label: range.label, hours: range.hours }}
            onChange={(option) => {
              const next = rangeByLabel.get(option.label);
              if (next) setRange(next);
            }}
            className="md:hidden"
          />
          <div className="bg-background hidden items-center gap-2 rounded-full border p-1 text-xs md:flex">
            {RANGE_OPTIONS.map((option) => {
              const isActive = range.label === option.label;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setRange(option)}
                  className={cn(
                    "rounded-full px-3 py-1 font-medium transition",
                    isActive
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={combinedData} margin={{ top: 20, right: 16, bottom: 24, left: 8 }}>
            <defs>
              <linearGradient id="issuanceStepGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="floorPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={[rangeBounds.start, rangeBounds.end]}
              padding={{ left: 8, right: 8 }}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(value: number) => formatDate(value, range.years)}
              ticks={tickIndices.map((i) => combinedData[i]!.timestamp)}
              tickMargin={10}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, className: "fill-muted-foreground" }}
              tickFormatter={(value: number) => formatPriceValue(value)}
              width={60}
              tickMargin={8}
              domain={yDomain}
            />
            <Tooltip
              content={({ active, payload }: ChartTooltipProps<CombinedDataPoint>) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as CombinedDataPoint;
                return (
                  <div className="bg-popover rounded-md border px-3 py-2 shadow-md">
                    <div className="text-xs font-medium">
                      {new Date(point.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <span>{`${formatPriceValue(point.issuancePrice)} ${baseSymbol}`}</span>
                    </div>
                    {point.floorPrice !== undefined && (
                      <div className="mt-1 flex items-center gap-2 text-sm">
                        <div className="size-2 rounded-full bg-sky-500" />
                        <span>{`${formatPriceValue(point.floorPrice)} ${baseSymbol}`}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="stepAfter"
              dataKey="issuancePrice"
              name="Issuance price"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#issuanceStepGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="floorPrice"
              name="Floor price"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#floorPriceGradient)"
              isAnimationActive={false}
              connectNulls={false}
            />
            {currentFloorPrice !== null && (
              <ReferenceDot x={now} y={currentFloorPrice} r={4} fill="#0ea5e9" stroke="none" />
            )}
            <ReferenceDot
              x={now}
              y={toIssuancePrice(summary.currentIssuance) ?? undefined}
              r={4}
              fill="#22c55e"
              stroke="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
