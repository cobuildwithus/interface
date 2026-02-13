import { base } from "viem/chains";
import { fromBaseUnits } from "@/lib/shared/numbers";
import { PROJECT_ID } from "./constants";
import {
  cashOutValueFromCoefficients,
  cashOutValuePerToken,
  getActiveRuleset,
  toBigInt,
  totalSupplyFromBaseUnits,
} from "./helpers";
import { applySnapshotsUntil, type SnapshotState } from "./snapshot-utils";
import type { IssuanceCashoutDataPoint, ParsedRuleset } from "./types";
import type { ProjectSnapshot } from "./data-loaders";

type CashoutValues = {
  cashOutValue: number;
  totalSupply: number;
  totalBalance: number;
  cashOutTaxRate: number;
};

export const getTimelineRulesets = (rulesets: ParsedRuleset[]) => {
  const primaryRulesets = rulesets.filter(
    (rule) => rule.chainId === base.id && rule.projectId === PROJECT_ID
  );
  return primaryRulesets.length > 0 ? primaryRulesets : rulesets;
};

export const buildRulesetIndex = (rulesets: ParsedRuleset[]) => {
  const rulesetByKey = new Map<string, ParsedRuleset>();
  for (const rule of rulesets) {
    rulesetByKey.set(`${rule.chainId}:${rule.rulesetId.toString()}`, rule);
  }
  return rulesetByKey;
};

export const resolveFallbackCashOutValue = (
  project: ProjectSnapshot,
  timelineRulesets: ParsedRuleset[],
  nowSec: number
) => {
  const cashoutA = toBigInt(project.cashoutA);
  const cashoutB = toBigInt(project.cashoutB);
  const hasCoefficients = cashoutA !== 0n || cashoutB !== 0n;
  const accountingDecimals = project.accountingDecimals ?? 18;

  const coefficientCashOutValue = hasCoefficients
    ? cashOutValueFromCoefficients(cashoutA, cashoutB, accountingDecimals)
    : null;
  const snapshotOverflow = toBigInt(project.balance);
  const snapshotSupply = toBigInt(project.erc20Supply) + toBigInt(project.pendingReservedTokens);
  const hasSnapshot = snapshotOverflow > 0n || snapshotSupply > 0n;

  const currentRuleset =
    getActiveRuleset(timelineRulesets, nowSec) ?? timelineRulesets[timelineRulesets.length - 1];
  const snapshotCashOutValue =
    currentRuleset && hasSnapshot
      ? cashOutValuePerToken(
          snapshotOverflow,
          snapshotSupply,
          currentRuleset.cashOutTaxRate,
          accountingDecimals
        )
      : null;

  return {
    fallbackCurrentCashOutValue: coefficientCashOutValue ?? snapshotCashOutValue,
    snapshotOverflow,
    snapshotSupply,
    accountingDecimals,
    currentRuleset,
  };
};

export const buildSnapshotValues = (
  snapshotState: SnapshotState,
  timestampSec: number,
  accountingDecimals: number
): CashoutValues => {
  const { sumBalance, sumSupply, globalTaxRate } = applySnapshotsUntil(snapshotState, timestampSec);

  return {
    cashOutValue: cashOutValuePerToken(sumBalance, sumSupply, globalTaxRate, accountingDecimals),
    totalSupply: totalSupplyFromBaseUnits(sumSupply),
    totalBalance: fromBaseUnits(sumBalance, accountingDecimals),
    cashOutTaxRate: globalTaxRate,
  };
};

export const buildPayEventValues = (
  overflow: bigint,
  supply: bigint,
  activeRuleset: ParsedRuleset,
  accountingDecimals: number,
  fallbackCurrentCashOutValue: number | null,
  shouldUsePayEvents: boolean
): CashoutValues => {
  const computedCashOutValue = cashOutValuePerToken(
    overflow,
    supply,
    activeRuleset.cashOutTaxRate,
    accountingDecimals
  );

  return {
    cashOutValue: shouldUsePayEvents
      ? computedCashOutValue
      : (fallbackCurrentCashOutValue ?? computedCashOutValue),
    totalSupply: totalSupplyFromBaseUnits(supply),
    totalBalance: fromBaseUnits(overflow, accountingDecimals),
    cashOutTaxRate: activeRuleset.cashOutTaxRate,
  };
};

export const appendDataPoint = (
  data: IssuanceCashoutDataPoint[],
  timestamp: number,
  issuancePrice: number,
  values: CashoutValues
) => {
  data.push({
    timestamp,
    issuancePrice,
    cashOutValue: values.cashOutValue,
    totalSupply: values.totalSupply,
    totalBalance: values.totalBalance,
    cashOutTaxRate: values.cashOutTaxRate,
  });
};
