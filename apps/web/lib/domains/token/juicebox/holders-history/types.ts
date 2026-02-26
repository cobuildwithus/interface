export type HoldersDataPoint = {
  timestamp: number; // unix ms
  holders: number; // cumulative unique holders
  medianContribution: number; // median contribution per holder
};

export type HoldersHistory = {
  data: HoldersDataPoint[];
  symbol: string;
};

export type BucketedPayments = Map<number, { payer: string; amount: number }[]>;
export type BucketedHolders = Map<number, string[]>;
