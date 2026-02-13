import type { FarcasterRuleSummary } from "@/lib/domains/rules/rules/platforms/registry";

export type SummaryJson = FarcasterRuleSummary;

type CheckCastAgainstRuleSuccess = {
  ok: true;
  data: SummaryJson;
};

type CheckCastAgainstRuleError = {
  ok: false;
  error: string;
  status?: number;
};

export type CheckCastAgainstRuleResult = CheckCastAgainstRuleSuccess | CheckCastAgainstRuleError;

export type CastRulesServerCheckInput = {
  ruleId: number;
  castHash: string;
  address: `0x${string}`;
  timeoutMs?: number;
};

export type CheckCastAgainstRuleInput = {
  castHash: string;
  ruleId: number;
};
