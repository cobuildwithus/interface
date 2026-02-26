import type { Numberish } from "@/lib/shared/numbers";

export type RawRuleset = {
  chainId: number;
  projectId: number;
  rulesetId: bigint;
  start: bigint;
  duration: bigint;
  weight: Numberish;
  weightCutPercent: number;
  reservedPercent: number;
  cashOutTaxRate: number;
};

export type ParsedRuleset = {
  chainId: number;
  projectId: number;
  rulesetId: bigint;
  start: number;
  duration: number;
  weight: number;
  weightCutPercent: number;
  reservedPercent: number;
  cashOutTaxRate: number;
};

export type IssuanceStage = {
  stage: number;
  start: number;
  end: number | null;
  duration: number;
  weight: number;
  weightCutPercent: number;
  reservedPercent: number;
  cashOutTaxRate: number;
};

export type IssuancePoint = {
  timestamp: number;
  issuancePrice: number;
};

export type IssuanceSummary = {
  currentIssuance: number | null;
  nextIssuance: number | null;
  nextChangeAt: number | null;
  nextChangeType: "cut" | "stage" | null;
  reservedPercent: number | null;
  activeStage: number | null;
  nextStage: number | null;
};

export type IssuanceBaseTerms = {
  baseSymbol: string;
  tokenSymbol: string;
  stages: IssuanceStage[];
  chartData: IssuancePoint[];
  chartStart: number;
  chartEnd: number;
};

export type IssuanceTerms = IssuanceBaseTerms & {
  now: number;
  activeStageIndex: number | null;
  summary: IssuanceSummary;
};
