import type { Numberish } from "@/lib/shared/numbers";

export type IssuanceCashoutDataPoint = {
  timestamp: number;
  issuancePrice: number;
  cashOutValue: number;
  totalSupply?: number;
  totalBalance?: number;
  cashOutTaxRate?: number;
};

export type IssuanceCashoutHistory = {
  data: IssuanceCashoutDataPoint[];
  baseSymbol: string;
  tokenSymbol: string;
};

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

export type RawPayment = {
  timestamp: number;
  amount: Numberish;
  effectiveTokenCount: Numberish;
  newlyIssuedTokenCount: Numberish;
  rulesetId: bigint;
  chainId: number;
};

export type RawCashoutSnapshot = {
  chainId: number;
  timestamp: number;
  cashoutA: Numberish;
  cashoutB: Numberish;
  balance: Numberish;
  totalSupply: Numberish;
  cashOutTaxRate: number;
};

export type ChainState = {
  index: number;
  balance: bigint;
  supply: bigint;
  tax: number;
  taxTimestamp: number;
};
