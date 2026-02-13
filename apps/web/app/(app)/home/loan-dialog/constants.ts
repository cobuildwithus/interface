export const MAX_PREPAID_FEE_PERCENT = 500;
export const MIN_PREPAID_FEE_PERCENT = 25;
export const LOAN_LIQUIDATION_YEARS = 10;
export const FEE_BPS_DENOMINATOR = 1000n;

export const REPAY_OPTIONS = [
  { label: "6 mo", years: 0.5 },
  { label: "1 yr", years: 1 },
  { label: "2 yr", years: 2 },
  { label: "5 yr", years: 5 },
  { label: "10 yr", years: 10 },
] as const;
