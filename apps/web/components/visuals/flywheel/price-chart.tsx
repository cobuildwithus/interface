"use client";

import { Area, AreaChart, ResponsiveContainer, YAxis } from "@/components/common/charts/recharts";
import { Currency } from "@/components/ui/currency";

export interface PricePoint {
  time: number;
  price: number;
}

interface PriceChartProps {
  priceHistory: PricePoint[];
}
export function PriceChart({ priceHistory }: PriceChartProps) {
  const safeHistory = priceHistory.length > 0 ? priceHistory : [{ time: 0, price: 0.0001 }];

  const currentPrice = safeHistory[safeHistory.length - 1]?.price ?? 0.0001;
  const startPrice = safeHistory[0]?.price ?? 0.0001;
  const change = ((currentPrice - startPrice) / startPrice) * 100;

  // Add padding around data so line isn't stuck to edges
  const dataMin = Math.min(...safeHistory.map((p) => p.price));
  const dataMax = Math.max(...safeHistory.map((p) => p.price));
  const range = Math.max(dataMax - dataMin, startPrice * 0.05);
  const padding = range * 0.3;
  const yMin = dataMin - padding;
  const yMax = dataMax + padding;

  return (
    <div className="w-80 rounded-xl border border-neutral-800 bg-neutral-950/50 p-4 sm:w-96">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-full border border-orange-500/40 bg-orange-500/20">
            <span className="-translate-y-0.5 text-lg leading-none font-bold text-orange-400">
              ◆
            </span>
          </div>
          <div>
            <div className="text-sm font-medium">$NETWORK</div>
            <div className="text-xs text-neutral-500">Token price</div>
          </div>
        </div>
        <div className="text-right">
          <Currency
            value={currentPrice}
            className="font-mono text-lg font-medium text-emerald-400"
          />
          <Currency
            value={change}
            kind="percent"
            showSign
            className={`block font-mono text-xs ${
              change >= 0 ? "text-emerald-500" : "text-rose-500"
            }`}
          />
        </div>
      </div>

      <div className="h-[140px] w-full">
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={safeHistory} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[yMin, yMax]} hide />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#priceGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-neutral-600">
        <span>Then</span>
        <span className="text-neutral-500">Now</span>
      </div>
    </div>
  );
}
