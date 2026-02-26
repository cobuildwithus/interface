import type { IssuanceCashoutHistory } from "@/lib/domains/token/juicebox/issuance-cashout-history";

export type RangeOption = {
  label: string;
  years: number | null;
  hours: number | null;
};

export type CashoutDataPoint = IssuanceCashoutHistory["data"][number];

export type CombinedDataPoint = {
  timestamp: number;
  issuancePrice: number;
  floorPrice?: number;
};
