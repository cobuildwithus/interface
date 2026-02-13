import { z } from "zod";

import { normalizeCastHash } from "@/lib/domains/rules/cast-rules/normalize";
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
import type { JsonValue } from "@/lib/shared/json";

const nonEmptyStrings = z.array(z.string().trim().min(1)).min(1);

export const FARCASTER_CLAUSE_TYPES = ["mentionsAll", "embedUrlPattern", "rootParentUrl"] as const;
export type FarcasterClauseType = (typeof FARCASTER_CLAUSE_TYPES)[number];
export type FarcasterClauseDraftType = FarcasterClauseType;

export const farcasterClauseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mentionsAll"),
    usernames: nonEmptyStrings,
  }),
  z.object({
    type: z.literal("embedUrlPattern"),
    patterns: nonEmptyStrings,
  }),
  z.object({
    type: z.literal("rootParentUrl"),
    urls: nonEmptyStrings,
  }),
]);

export type FarcasterClauseInput = z.infer<typeof farcasterClauseSchema>;

export const FARCASTER_CLAUSE_DEFINITIONS: readonly ClauseDraftDefinition<
  FarcasterClauseType,
  FarcasterClauseInput
>[] = [
  {
    type: "mentionsAll",
    label: "Mentions all (usernames)",
    buttonLabel: "Mentions All",
    description: "Posts must mention all specified users",
    placeholder: "Enter usernames, one per line\ne.g., dwr.eth",
    helpText: "Enter usernames, one per line.",
    normalizeItems: normalizeUsernames,
    build: (items) => ({ type: "mentionsAll", usernames: items }),
  },
  {
    type: "embedUrlPattern",
    label: "Embed URL pattern",
    buttonLabel: "Embed URL",
    description: "Posts must contain matching URLs",
    placeholder: "Enter patterns, one per line\ne.g., *.example.com/*",
    helpText: "Enter one pattern per line.",
    build: (items) => ({ type: "embedUrlPattern", patterns: items }),
  },
  {
    type: "rootParentUrl",
    label: "Root parent URL",
    buttonLabel: "Channel",
    description: "Posts must be in specific channels",
    placeholder: "Enter channel URLs, one per line",
    helpText: "Enter one URL per line (exact match after normalization).",
    build: (items) => ({ type: "rootParentUrl", urls: items }),
  },
];

type KnownOutcomeCode =
  | "passed"
  | "deterministic_failed"
  | "semantic_gate_failed"
  | "llm_failed"
  | "llm_missing_fail_closed"
  | "no_tags"
  | "rule_limit_reached"
  | "rule_not_found"
  | "cast_not_found"
  | "neynar_score_blocked"
  | "invalid_input"
  | "internal_error";

type OutcomeCode = KnownOutcomeCode | (string & {});

interface SummarySemantic {
  accepted: boolean;
  passes: number;
  failures: number;
  score?: number | null;
  threshold?: number | null;
}

interface SummaryLlm {
  gradeEvaluated: boolean;
  pass: boolean | null;
  reason: string | null;
}

export interface FarcasterRuleSummary {
  castHash: string;
  ruleId: number;
  rulePassed: boolean;
  outcomeCode: OutcomeCode;
  outcomeReason: string;
  tags: string[];
  matchWhy?: string[];
  metadata?: {
    deleted: boolean;
    hasParent: boolean;
  } | null;
  semantic?: SummarySemantic | null;
  llm?: SummaryLlm | null;
  castFound?: boolean;
  ruleFound?: boolean;
  deterministicMatch?: boolean;
  persisted?: boolean;
  error?: string;
}

export function coerceFarcasterSummaryFromSuccess(
  json: JsonValue,
  fallback: { castHash: string; ruleId: number }
): FarcasterRuleSummary | null {
  const obj = unwrapData(json);
  if (!obj) return null;

  const rulePassedValue = readRulePassedValue(obj);
  if (rulePassedValue === null) return null;
  const rulePassed = typeof rulePassedValue === "boolean" ? rulePassedValue : false;

  const outcomeCode = readNonEmptyString(obj.outcomeCode) ?? readNonEmptyString(obj.code) ?? null;
  const outcomeReason =
    readNonEmptyString(obj.outcomeReason) ?? readNonEmptyString(obj.reason) ?? null;
  if (!outcomeCode || !outcomeReason) return null;

  const ruleId = coerceRuleId(obj.ruleId, fallback.ruleId);

  const castHashCandidate =
    readNonEmptyString(obj.castHash) ?? readNonEmptyString(obj.postId) ?? null;
  const castHash = normalizeCastHash(castHashCandidate) ?? castHashCandidate ?? fallback.castHash;

  const tags = Array.isArray(obj.tags)
    ? obj.tags.filter((t): t is string => typeof t === "string")
    : [];
  const matchWhy = Array.isArray(obj.matchWhy)
    ? obj.matchWhy.filter((t): t is string => typeof t === "string")
    : undefined;

  const metadata =
    obj.metadata === null || (obj.metadata !== undefined && isRecord(obj.metadata))
      ? (obj.metadata as FarcasterRuleSummary["metadata"])
      : null;
  const semantic =
    obj.semantic === null || (obj.semantic !== undefined && isRecord(obj.semantic))
      ? (obj.semantic as FarcasterRuleSummary["semantic"])
      : null;
  const llm =
    obj.llm === null || (obj.llm !== undefined && isRecord(obj.llm))
      ? (obj.llm as FarcasterRuleSummary["llm"])
      : null;

  return {
    castHash,
    ruleId,
    rulePassed,
    outcomeCode,
    outcomeReason,
    tags,
    ...(matchWhy ? { matchWhy } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
    ...(semantic !== undefined ? { semantic } : {}),
    ...(llm !== undefined ? { llm } : {}),
    ...(typeof obj.castFound === "boolean" ? { castFound: obj.castFound } : {}),
    ...(typeof obj.ruleFound === "boolean" ? { ruleFound: obj.ruleFound } : {}),
    ...(typeof obj.deterministicMatch === "boolean"
      ? { deterministicMatch: obj.deterministicMatch }
      : {}),
    ...(typeof obj.persisted === "boolean" ? { persisted: obj.persisted } : {}),
    ...(typeof obj.error === "string" ? { error: obj.error } : {}),
  };
}

/**
 * Extracts a FarcasterRuleSummary from an HTTP error response.
 * Used to recover structured data from 4xx errors that include JSON in the message.
 */
export function extractFarcasterSummaryFromError(
  error: Error & { status?: number },
  fallback: { castHash: string; ruleId: number }
): FarcasterRuleSummary | null {
  const parsed = parseHttpErrorJsonObject(error);
  if (!parsed) return null;
  return coerceFarcasterSummaryFromSuccess(parsed, fallback);
}

/**
 * Formats a Farcaster rules error into a user-friendly message.
 */
export function formatFarcasterRulesError(error: Error & { status?: number }): string {
  const message = formatRulesCheckError(error, { defaultMessage: "Failed to check cast." });
  return formatOutcomeReasonForUser(message);
}

export const farcasterRulesAdapter: RulesPlatformAdapter<
  FarcasterRuleSummary,
  { castHash: string; ruleId: number }
> = {
  platform: "farcaster",
  logLabel: "cast-rules",
  createFallback: ({ ruleId, postRef }) => ({ castHash: postRef, ruleId }),
  buildRequestBody: ({ ruleId, postRef, address }) => ({
    platform: "farcaster",
    postRef,
    ruleId,
    address,
  }),
  coerceSummaryFromSuccess: coerceFarcasterSummaryFromSuccess,
  extractSummaryFromError: extractFarcasterSummaryFromError,
  formatError: formatFarcasterRulesError,
};
