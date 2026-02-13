export type CastIntentSwap = {
  id: string;
  backerAddress: string;
  reaction: string | null;
  spendUsdc: number;
  tokensBought: number;
  tokenSymbol: string;
};

export type CastBacker = {
  address: string;
  totalSpend: number;
};

export function aggregateBackersFromSwaps(swaps: CastIntentSwap[]): CastBacker[] {
  if (!swaps || swaps.length === 0) return [];

  const totals = new Map<string, number>();
  for (const swap of swaps) {
    const address = swap.backerAddress.toLowerCase();
    totals.set(address, (totals.get(address) ?? 0) + (swap.spendUsdc ?? 0));
  }

  return Array.from(totals.entries())
    .map(([address, totalSpend]) => ({ address, totalSpend }))
    .sort((a, b) => b.totalSpend - a.totalSpend);
}
