"use client";

import { PriceChart, PricePoint } from "./price-chart";

interface InvestSectionProps {
  priceHistory: PricePoint[];
}

export function InvestSection({ priceHistory }: InvestSectionProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="text-xs tracking-widest text-neutral-500 uppercase">Fund</div>
      <PriceChart priceHistory={priceHistory} />
      <p className="max-w-xs text-center text-xs text-neutral-400">
        A share of newly minted tokens are paid to builders.
      </p>
    </div>
  );
}
