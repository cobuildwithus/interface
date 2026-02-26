import "server-only";

import { checkRulesApi } from "@/lib/domains/rules/rules-api/check";
import type { JsonValue } from "@/lib/shared/json";
import type { RulesCheckResult, RulesPlatformAdapter } from "./types";

const DEFAULT_CHECK_TIMEOUT_MS = 40_000;
const DEFAULT_CHECK_RETRIES_ON_429 = 8;
const DEFAULT_MAX_RETRIES = 1;

export type PlatformRulesServerCheckInput = {
  ruleId: number;
  postRef: string;
  address: `0x${string}`;
  authorUsername?: string;
  timeoutMs?: number;
};

export async function runPlatformRulesServerCheck<TSummary, TFallback>(
  adapter: RulesPlatformAdapter<TSummary, TFallback>,
  input: PlatformRulesServerCheckInput
): Promise<RulesCheckResult<TSummary>> {
  const fallback = adapter.createFallback({ ruleId: input.ruleId, postRef: input.postRef });
  const path = adapter.path ?? "/v1/posts/check";

  const result = await checkRulesApi<JsonValue | TSummary, TFallback>({
    path,
    body: adapter.buildRequestBody({
      ruleId: input.ruleId,
      postRef: input.postRef,
      address: input.address,
      authorUsername: input.authorUsername,
    }),
    fallback,
    extractFromError: adapter.extractSummaryFromError,
    formatError: adapter.formatError,
    timeoutMs: input.timeoutMs ?? DEFAULT_CHECK_TIMEOUT_MS,
    retriesOn429: DEFAULT_CHECK_RETRIES_ON_429,
    maxRetries: DEFAULT_MAX_RETRIES,
  });

  if (!result.ok) return result;

  const normalized = adapter.coerceSummaryFromSuccess(result.data as JsonValue, fallback);
  if (!normalized) {
    console.error(`[${adapter.logLabel}] invalid rules API response for ${path}`, result.data);
    return { ok: false, error: "Rules API returned an invalid response." };
  }

  return { ok: true, data: normalized };
}
