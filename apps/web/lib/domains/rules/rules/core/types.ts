import type { PostPlatform } from "@/lib/domains/social/platforms";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

export type ClauseDraft<TType extends string> = {
  id: string;
  type: TType;
  raw: string;
};

export type ClauseDraftDefinition<TType extends string, TClauseInput extends { type: TType }> = {
  type: TType;
  label: string;
  buttonLabel: string;
  description: string;
  placeholder: string;
  helpText: string;
  normalizeItems?: (items: string[]) => string[];
  build: (items: string[]) => TClauseInput;
};

export type ClauseDraftOption<TType extends string> = {
  value: TType;
  label: string;
  description: string;
  placeholder: string;
};

export type RulesCheckResult<TSummary> =
  | { ok: true; data: TSummary }
  | { ok: false; error: string; status?: number };

export type RulesPlatformAdapter<TSummary, TFallback> = {
  platform: PostPlatform;
  path?: string;
  logLabel: string;
  createFallback: (input: { ruleId: number; postRef: string }) => TFallback;
  buildRequestBody: (input: {
    ruleId: number;
    postRef: string;
    address: `0x${string}`;
    authorUsername?: string;
  }) => JsonRecord;
  coerceSummaryFromSuccess: (json: JsonValue, fallback: TFallback) => TSummary | null;
  extractSummaryFromError: (
    error: Error & { status?: number },
    fallback: TFallback
  ) => TSummary | null;
  formatError: (error: Error & { status?: number }) => string;
};
