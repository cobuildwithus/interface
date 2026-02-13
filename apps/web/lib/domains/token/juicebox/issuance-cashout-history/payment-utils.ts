import { adjustForReserved, toBigInt } from "./helpers";
import type { ParsedRuleset, RawPayment } from "./types";

export type PaymentState = {
  payments: RawPayment[];
  paymentIndex: number;
  overflow: bigint;
  supply: bigint;
  shouldUsePayEvents: boolean;
  fallbackRulesetIndex: number;
  fallbackRuleset: ParsedRuleset | undefined;
};

export const initPaymentState = (
  payments: RawPayment[],
  snapshotOverflow: bigint,
  snapshotSupply: bigint,
  fallbackRuleset: ParsedRuleset | undefined
): PaymentState => ({
  payments,
  paymentIndex: 0,
  overflow: payments.length > 0 ? 0n : snapshotOverflow,
  supply: payments.length > 0 ? 0n : snapshotSupply,
  shouldUsePayEvents: payments.length > 0,
  fallbackRulesetIndex: 0,
  fallbackRuleset,
});

type ApplyPaymentsInput = {
  state: PaymentState;
  timestampMs: number;
  rulesetByKey: Map<string, ParsedRuleset>;
  timelineRulesets: ParsedRuleset[];
};

export const applyPaymentsUntil = ({
  state,
  timestampMs,
  rulesetByKey,
  timelineRulesets,
}: ApplyPaymentsInput) => {
  while (
    state.paymentIndex < state.payments.length &&
    state.payments[state.paymentIndex]!.timestamp * 1000 <= timestampMs
  ) {
    const payment = state.payments[state.paymentIndex]!;
    if (toBigInt(payment.newlyIssuedTokenCount) > 0n) {
      state.overflow += toBigInt(payment.amount);
    }

    let reservedPercent = rulesetByKey.get(
      `${payment.chainId}:${payment.rulesetId.toString()}`
    )?.reservedPercent;

    if (reservedPercent === undefined) {
      const paymentSec = payment.timestamp;
      while (
        state.fallbackRulesetIndex < timelineRulesets.length - 1 &&
        paymentSec >= timelineRulesets[state.fallbackRulesetIndex + 1]!.start
      ) {
        state.fallbackRulesetIndex += 1;
        state.fallbackRuleset = timelineRulesets[state.fallbackRulesetIndex]!;
      }
      reservedPercent = state.fallbackRuleset?.reservedPercent ?? 0;
    }

    const minted = toBigInt(payment.effectiveTokenCount);
    state.supply += adjustForReserved(minted, reservedPercent);

    state.paymentIndex += 1;
  }
};
