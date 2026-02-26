export type WindowStats<T> = {
  last6h: T | null;
  last24h: T | null;
  last7d: T | null;
  last30d: T | null;
};

export type TreasuryStats = {
  balance: { base: number | null; usd: number | null };
  inflow: {
    lifetime: number | null;
    last6h: number | null;
    last24h: number | null;
    last7d: number | null;
    last30d: number | null;
  };
  paceWeekly: { last7d: number | null; last30d: number | null };
};

export type IssuanceStats = {
  currentPrice: { basePerToken: number | null; usdPerToken: number | null };
  nextPrice: { basePerToken: number | null; usdPerToken: number | null };
  nextChangeAt: number | null;
  nextChangeType: "cut" | "stage" | null;
  activeStage: number | null;
  nextStage: number | null;
  reservedPercent: number | null;
  cashOutTaxRate: number | null;
};

export type MintStats = {
  count: WindowStats<number>;
  uniqueMinters: WindowStats<number>;
  medianPrice: WindowStats<{ basePerToken: number | null; usdPerToken: number | null }>;
  medianSize: WindowStats<{ tokens: number | null }>;
};

export type HolderStats = {
  total: number | null;
  new: WindowStats<number>;
  medianContribution: { base: number | null; usd: number | null };
};

export type DistributionStats = {
  totalSupply: number | null;
  top10Tokens: number | null;
  top1Tokens: number | null;
  top10Share: number | null;
  top1Share: number | null;
};

export type GoalAiContextData = {
  baseAsset: {
    symbol: string;
    decimals: number;
    priceUsd: number | null;
  };
  token: {
    symbol: string;
    decimals: number;
  };
  treasury: TreasuryStats;
  issuance: IssuanceStats;
  mints: MintStats;
  holders: HolderStats;
  distribution: DistributionStats;
};

export type GoalAiContextResponse = {
  goalAddress: string;
  asOf: string;
  asOfMs: number;
  prompt: string;
  data: GoalAiContextData;
};
