import type { XRuleSummary } from "@/lib/domains/rules/rules/platforms/registry";

export type TweetSummaryJson = XRuleSummary;

type CheckTweetAgainstRuleSuccess = {
  ok: true;
  data: TweetSummaryJson;
};

type CheckTweetAgainstRuleError = {
  ok: false;
  error: string;
  status?: number;
};

export type CheckTweetAgainstRuleResult = CheckTweetAgainstRuleSuccess | CheckTweetAgainstRuleError;

export type TweetRulesServerCheckInput = {
  ruleId: number;
  tweetUrlOrId: string;
  address: `0x${string}`;
  authorUsername?: string;
  timeoutMs?: number;
};

export type CheckTweetAgainstRuleInput = {
  ruleId: number;
  tweetUrlOrId: string;
};
