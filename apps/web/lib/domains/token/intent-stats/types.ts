export type IntentStats = {
  backersCount: number;
  totalBackersCount: number;
  raisedUsdc: number;
  qfMatchUsd: number;
};

export type RawContribution = {
  castHash: string;
  wallet: string;
  tokens: number;
  spendUsdc: number;
};

export type FidMatch = {
  fid: number;
  neynarUserScore: number | null;
};

export type CastAggregation = {
  eligibleBackerTotals: Map<string, number>;
  allWallets: Set<string>;
  totalTokens: number;
  totalSpendUsdc: number;
};
