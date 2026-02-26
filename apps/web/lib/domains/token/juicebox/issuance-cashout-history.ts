import "server-only";

import { unstable_cache } from "next/cache";
import { PROJECT_ID } from "./issuance-cashout-history/constants";
import {
  fetchPayments,
  fetchProject,
  fetchRulesets,
  fetchSnapshots,
} from "./issuance-cashout-history/data-loaders";
import { buildIssuanceCashoutHistory } from "./issuance-cashout-history/history-builder";
import type { RawCashoutSnapshot, RawPayment, RawRuleset } from "./issuance-cashout-history/types";
export type { IssuanceCashoutHistory } from "./issuance-cashout-history/types";

type CashoutHistoryInputs = {
  project: Awaited<ReturnType<typeof fetchProject>>;
  rawRulesets: RawRuleset[];
  cashoutSnapshots: RawCashoutSnapshot[];
  payments: RawPayment[];
};

const fetchHistoryInputs = async (): Promise<CashoutHistoryInputs> => {
  const project = await fetchProject();
  const rawRulesets = await fetchRulesets(project.suckerGroupId);
  if (rawRulesets.length === 0) {
    return {
      project,
      rawRulesets,
      cashoutSnapshots: [],
      payments: [],
    };
  }

  const cashoutSnapshots = (await fetchSnapshots(project.suckerGroupId)) ?? [];
  const payments =
    cashoutSnapshots.length === 0 ? ((await fetchPayments(project.suckerGroupId)) ?? []) : [];

  return {
    project,
    rawRulesets,
    cashoutSnapshots,
    payments,
  };
};

const resolveHistoryNowMs = ({
  rawRulesets,
  cashoutSnapshots,
  payments,
}: CashoutHistoryInputs): number => {
  if (rawRulesets.length === 0) {
    return 0;
  }
  const latestRulesetStart = Number(rawRulesets[rawRulesets.length - 1]!.start);
  const latestSnapshot = cashoutSnapshots[cashoutSnapshots.length - 1]?.timestamp ?? 0;
  const latestPayment = payments[payments.length - 1]?.timestamp ?? 0;
  return Math.max(latestRulesetStart, latestSnapshot, latestPayment, 0) * 1000;
};

const buildHistory = (
  { project, rawRulesets, cashoutSnapshots, payments }: CashoutHistoryInputs,
  now?: number
) =>
  buildIssuanceCashoutHistory({
    project,
    rawRulesets,
    cashoutSnapshots: rawRulesets.length === 0 ? [] : cashoutSnapshots,
    payments: rawRulesets.length === 0 ? [] : payments,
    ...(now !== undefined ? { now } : {}),
  });

const fetchIssuanceCashoutHistory = async () => buildHistory(await fetchHistoryInputs());

const fetchIssuanceCashoutHistoryBase = async () => {
  const inputs = await fetchHistoryInputs();
  const now = resolveHistoryNowMs(inputs);

  return buildHistory(inputs, now);
};

export const getIssuanceCashoutHistory = unstable_cache(
  fetchIssuanceCashoutHistory,
  ["issuance-cashout-history-v3", String(PROJECT_ID)],
  { revalidate: 300 }
);

export const getIssuanceCashoutHistoryBase = unstable_cache(
  fetchIssuanceCashoutHistoryBase,
  ["issuance-cashout-history-base-v1", String(PROJECT_ID)],
  { revalidate: 300 }
);
