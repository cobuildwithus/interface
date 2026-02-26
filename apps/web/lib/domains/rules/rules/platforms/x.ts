import { z } from "zod";

import { formatOutcomeReasonForUser } from "@/lib/domains/rules/rules/core/format-outcome-reason";
import {
  formatRulesCheckError,
  parseHttpErrorJsonObject,
} from "@/lib/domains/rules/rules/core/http-error-json";
import { normalizeUsernames } from "@/lib/domains/rules/rules/core/normalize";
import type {
  ClauseDraftDefinition,
  RulesPlatformAdapter,
} from "@/lib/domains/rules/rules/core/types";
import {
  coerceRuleId,
  isRecord,
  readNonEmptyString,
  readRulePassedValue,
  unwrapData,
} from "@/lib/domains/rules/rules/platforms/utils";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

const nonEmptyStrings = z.array(z.string().trim().min(1)).min(1);

export const X_CLAUSE_TYPES = ["mentionsAll", "embedUrlPattern"] as const;
export type XClauseType = (typeof X_CLAUSE_TYPES)[number];
export type XClauseDraftType = XClauseType;

export const xClauseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mentionsAll"),
    usernames: nonEmptyStrings,
  }),
  z.object({
    type: z.literal("embedUrlPattern"),
    patterns: nonEmptyStrings,
  }),
]);

export type XClauseInput = z.infer<typeof xClauseSchema>;

export const X_CLAUSE_DEFINITIONS: readonly ClauseDraftDefinition<XClauseType, XClauseInput>[] = [
  {
    type: "mentionsAll",
    label: "Mentions all (usernames)",
    buttonLabel: "Mentions All",
    description: "Posts must mention all usernames",
    placeholder: "Enter usernames, one per line\ne.g., justcobuild",
    helpText: "Enter usernames, one per line.",
    normalizeItems: normalizeUsernames,
    build: (items) => ({ type: "mentionsAll", usernames: items }),
  },
  {
    type: "embedUrlPattern",
    label: "Embed URL pattern",
    buttonLabel: "Embed URL",
    description: "Posts must contain matching URLs",
    placeholder: "Enter patterns, one per line",
    helpText: "Enter one pattern per line.",
    build: (items) => ({ type: "embedUrlPattern", patterns: items }),
  },
];

type KnownTweetOutcomeCode =
  | "passed"
  | "llm_failed"
  | "llm_missing_fail_closed"
  | "rule_limit_reached"
  | "rule_not_found"
  | "rule_platform_not_allowed"
  | "tweet_not_found"
  | "tweet_repost_not_allowed"
  | "invalid_input"
  | "internal_error";

type TweetOutcomeCode = KnownTweetOutcomeCode | (string & {});

export interface XRuleSummary {
  tweetId: string;
  ruleId: number;
  tweetFound: boolean;
  metadata: {
    authorId: string | null;
    createdAt: string | null;
    isRepost: boolean;
  } | null;
  ruleFound: boolean;
  llm: {
    gradeEvaluated: boolean;
    pass: boolean | null;
    reason: string | null;
    [key: string]: JsonValue;
  };
  rulePassed: boolean;
  outcomeCode: TweetOutcomeCode;
  outcomeReason: string;
  persisted: boolean;
  error?: string;
}

export function coerceXSummaryFromSuccess(
  json: JsonValue,
  fallback: { tweetId: string; ruleId: number }
): XRuleSummary | null {
  const obj = unwrapData(json);
  if (!obj) return null;

  const tweetId =
    readNonEmptyString(obj.tweetId) ?? readNonEmptyString(obj.postId) ?? fallback.tweetId;
  const ruleId = coerceRuleId(obj.ruleId, fallback.ruleId);

  const rulePassedValue = readRulePassedValue(obj);
  if (rulePassedValue === null) return null;
  const rulePassed = typeof rulePassedValue === "boolean" ? rulePassedValue : false;

  const outcomeCode = readNonEmptyString(obj.outcomeCode) ?? readNonEmptyString(obj.code) ?? null;
  const outcomeReason =
    readNonEmptyString(obj.outcomeReason) ?? readNonEmptyString(obj.reason) ?? null;
  if (!outcomeCode || !outcomeReason) return null;

  const tweetFound = typeof obj.tweetFound === "boolean" ? obj.tweetFound : true;
  const ruleFound = typeof obj.ruleFound === "boolean" ? obj.ruleFound : true;
  const persisted = typeof obj.persisted === "boolean" ? obj.persisted : false;

  const llmRaw = isRecord(obj.llm) ? (obj.llm as JsonRecord) : null;
  const llm: XRuleSummary["llm"] = llmRaw
    ? {
        gradeEvaluated: typeof llmRaw.gradeEvaluated === "boolean" ? llmRaw.gradeEvaluated : false,
        pass: typeof llmRaw.pass === "boolean" ? llmRaw.pass : null,
        reason: readNonEmptyString(llmRaw.reason) ?? null,
      }
    : { gradeEvaluated: false, pass: null, reason: null };

  const metadata =
    obj.metadata === null || (obj.metadata !== undefined && isRecord(obj.metadata))
      ? (obj.metadata as XRuleSummary["metadata"])
      : null;
  const error = readNonEmptyString(obj.error) ?? undefined;

  return {
    tweetId,
    ruleId,
    tweetFound,
    metadata,
    ruleFound,
    llm,
    rulePassed,
    outcomeCode,
    outcomeReason,
    persisted,
    ...(error ? { error } : {}),
  };
}

export function extractXSummaryFromError(
  error: Error & { status?: number },
  fallback: { tweetId: string; ruleId: number }
): XRuleSummary | null {
  const parsed = parseHttpErrorJsonObject(error);
  if (!parsed) return null;

  return coerceXSummaryFromSuccess(parsed, fallback);
}

export function formatXRulesError(error: Error & { status?: number }): string {
  const message = formatRulesCheckError(error, { defaultMessage: "Failed to check post." });
  return formatOutcomeReasonForUser(message);
}

export const xRulesAdapter: RulesPlatformAdapter<
  XRuleSummary,
  { tweetId: string; ruleId: number }
> = {
  platform: "x",
  logLabel: "tweet-rules",
  createFallback: ({ ruleId, postRef }) => ({ tweetId: postRef, ruleId }),
  buildRequestBody: ({ ruleId, postRef, address, authorUsername }) => ({
    platform: "x",
    postRef,
    ruleId,
    address,
    ...(authorUsername ? { authorUsername } : {}),
  }),
  coerceSummaryFromSuccess: coerceXSummaryFromSuccess,
  extractSummaryFromError: extractXSummaryFromError,
  formatError: formatXRulesError,
};
