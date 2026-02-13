const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export const RAISE_1M_RAISED = 84_250;
export const RAISE_1M_GOAL = 1_000_000;

export function formatUsd(amount: number): string {
  return usdFormatter.format(amount);
}
