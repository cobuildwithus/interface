import { BUCKET_SIZE_MS } from "./constants";
import { issuancePriceAtTimestamp, parseRuleset } from "./helpers";
import { applyPaymentsUntil, initPaymentState } from "./payment-utils";
import { initSnapshotState } from "./snapshot-utils";
import type { IssuanceCashoutHistory, RawCashoutSnapshot, RawPayment, RawRuleset } from "./types";
import type { ProjectSnapshot } from "./data-loaders";
import {
  appendDataPoint,
  buildPayEventValues,
  buildRulesetIndex,
  buildSnapshotValues,
  getTimelineRulesets,
  resolveFallbackCashOutValue,
} from "./history-utils";
import { getActiveRuleset } from "./helpers";

type BuildInputs = {
  project: ProjectSnapshot;
  rawRulesets: RawRuleset[];
  cashoutSnapshots: RawCashoutSnapshot[];
  payments: RawPayment[];
  now?: number;
};

export const buildIssuanceCashoutHistory = ({
  project,
  rawRulesets,
  cashoutSnapshots,
  payments,
  now = Date.now(),
}: BuildInputs): IssuanceCashoutHistory => {
  const baseSymbol = project.accountingTokenSymbol;
  const tokenSymbol = project.erc20Symbol ?? "TOKEN";

  if (rawRulesets.length === 0) {
    return { data: [], baseSymbol, tokenSymbol };
  }

  const allRulesets = rawRulesets.map(parseRuleset);
  const timelineRulesets = getTimelineRulesets(allRulesets);
  const rulesetByKey = buildRulesetIndex(allRulesets);

  const nowSec = Math.floor(now / 1000);
  const { fallbackCurrentCashOutValue, snapshotOverflow, snapshotSupply, accountingDecimals } =
    resolveFallbackCashOutValue(project, timelineRulesets, nowSec);

  const useSnapshotHistory = cashoutSnapshots.length > 0;
  const snapshotState = useSnapshotHistory ? initSnapshotState(cashoutSnapshots) : null;

  const paymentState = useSnapshotHistory
    ? null
    : initPaymentState(payments, snapshotOverflow, snapshotSupply, timelineRulesets[0]);

  const startRulesetMs = timelineRulesets[0] ? timelineRulesets[0].start * 1000 : now;
  const startBucket = Math.floor(startRulesetMs / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;
  const endBucket = Math.floor(now / BUCKET_SIZE_MS) * BUCKET_SIZE_MS;

  const data: IssuanceCashoutHistory["data"] = [];

  let rulesetIndex = 0;
  let activeRuleset = timelineRulesets[0];

  for (let bucket = startBucket; bucket <= endBucket; bucket += BUCKET_SIZE_MS) {
    const bucketSec = Math.floor(bucket / 1000);

    while (
      rulesetIndex < timelineRulesets.length - 1 &&
      bucketSec >= timelineRulesets[rulesetIndex + 1]!.start
    ) {
      rulesetIndex += 1;
      activeRuleset = timelineRulesets[rulesetIndex]!;
    }

    if (!useSnapshotHistory && paymentState?.shouldUsePayEvents) {
      applyPaymentsUntil({
        state: paymentState,
        timestampMs: bucket,
        rulesetByKey,
        timelineRulesets,
      });
    }

    if (!activeRuleset) continue;
    const issuancePrice = issuancePriceAtTimestamp(activeRuleset, bucketSec);
    if (issuancePrice === null) continue;

    const values = useSnapshotHistory
      ? buildSnapshotValues(snapshotState!, bucketSec, accountingDecimals)
      : buildPayEventValues(
          paymentState!.overflow,
          paymentState!.supply,
          activeRuleset,
          accountingDecimals,
          fallbackCurrentCashOutValue,
          paymentState!.shouldUsePayEvents
        );

    appendDataPoint(data, bucket, issuancePrice, values);
  }

  if (now > endBucket) {
    if (!useSnapshotHistory && paymentState?.shouldUsePayEvents) {
      applyPaymentsUntil({
        state: paymentState,
        timestampMs: now,
        rulesetByKey,
        timelineRulesets,
      });
    }

    const activeNowRuleset = getActiveRuleset(timelineRulesets, nowSec) ?? activeRuleset;
    const issuancePrice = activeNowRuleset
      ? issuancePriceAtTimestamp(activeNowRuleset, nowSec)
      : null;

    if (activeNowRuleset && issuancePrice !== null) {
      const values = useSnapshotHistory
        ? buildSnapshotValues(snapshotState!, nowSec, accountingDecimals)
        : buildPayEventValues(
            paymentState!.overflow,
            paymentState!.supply,
            activeNowRuleset,
            accountingDecimals,
            fallbackCurrentCashOutValue,
            paymentState!.shouldUsePayEvents
          );

      appendDataPoint(data, now, issuancePrice, values);
    }
  }

  if (!useSnapshotHistory && fallbackCurrentCashOutValue !== null && data.length > 0) {
    data[data.length - 1]!.cashOutValue = fallbackCurrentCashOutValue;
  }

  return { data, baseSymbol, tokenSymbol };
};
