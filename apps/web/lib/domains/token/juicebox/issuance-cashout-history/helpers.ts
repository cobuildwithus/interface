import { fromBaseUnits, toBigIntSafe, toFiniteNumber, type Numberish } from "@/lib/shared/numbers";
import {
  MAX_TAX,
  RESERVED_SCALE,
  TOKEN_DECIMALS,
  WAD,
  WAD2,
  WEIGHT_CUT_SCALE,
  WEIGHT_SCALE,
} from "./constants";
import type { ParsedRuleset, RawRuleset } from "./types";

export const toBigInt = (value: Numberish): bigint => {
  try {
    return toBigIntSafe(value);
  } catch {
    return 0n;
  }
};

export const toNumber = (value: Numberish): number => toFiniteNumber(value) ?? 0;

export const parseRuleset = (rule: RawRuleset): ParsedRuleset => ({
  chainId: rule.chainId,
  projectId: rule.projectId,
  rulesetId: rule.rulesetId,
  start: Number(rule.start),
  duration: Number(rule.duration),
  weight: toNumber(rule.weight) / WEIGHT_SCALE,
  weightCutPercent: rule.weightCutPercent / WEIGHT_CUT_SCALE,
  reservedPercent: rule.reservedPercent,
  cashOutTaxRate: rule.cashOutTaxRate,
});

export const getActiveRuleset = (
  rulesets: ParsedRuleset[],
  timestamp: number
): ParsedRuleset | undefined => {
  for (let i = rulesets.length - 1; i >= 0; i -= 1) {
    if (timestamp >= rulesets[i]!.start) return rulesets[i];
  }
  return undefined;
};

export const issuancePriceAtTimestamp = (
  ruleset: ParsedRuleset,
  timestamp: number
): number | null => {
  if (!Number.isFinite(ruleset.weight) || ruleset.weight <= 0) return null;

  const elapsed = timestamp - ruleset.start;
  const cycles = ruleset.duration > 0 ? Math.floor(elapsed / ruleset.duration) : 0;
  const decay = 1 - ruleset.weightCutPercent;
  const currentWeight = ruleset.weight * Math.pow(decay, Math.max(0, cycles));

  if (!Number.isFinite(currentWeight) || currentWeight <= 0) return null;

  return 1 / currentWeight;
};

export const cashOutValuePerToken = (
  overflow: bigint,
  supply: bigint,
  taxRate: number,
  accountingDecimals: number
): number => {
  if (overflow <= 0n || supply <= 0n) return 0;

  const tax = BigInt(Math.max(0, Math.min(RESERVED_SCALE, taxRate)));
  const A = (overflow * (MAX_TAX - tax) * WAD) / (MAX_TAX * supply);
  const B = (overflow * tax * WAD2) / (MAX_TAX * supply * supply);
  const value = A + B;

  return fromBaseUnits(value.toString(), accountingDecimals);
};

export const cashOutValueFromCoefficients = (
  cashoutA: bigint,
  cashoutB: bigint,
  accountingDecimals: number
): number => {
  if (cashoutA === 0n && cashoutB === 0n) return 0;
  return fromBaseUnits((cashoutA + cashoutB).toString(), accountingDecimals);
};

export const adjustForReserved = (minted: bigint, reservedPercent: number): bigint => {
  const reserved = BigInt(Math.max(0, Math.min(RESERVED_SCALE, reservedPercent)));
  const effective = BigInt(RESERVED_SCALE) - reserved;
  if (effective <= 0n) return minted;
  return (minted * BigInt(RESERVED_SCALE)) / effective;
};

export const totalSupplyFromBaseUnits = (value: bigint) => fromBaseUnits(value, TOKEN_DECIMALS);
