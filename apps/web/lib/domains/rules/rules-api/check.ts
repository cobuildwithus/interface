import "server-only";

import {
  postRulesApiJson,
  RulesApiNotConfiguredError,
} from "@/lib/domains/rules/rules-api/post-json";
import type { JsonRecord } from "@/lib/shared/json";

type RulesApiCheckResult<TSummary> =
  | { ok: true; data: TSummary }
  | { ok: false; error: string; status?: number };

type CheckRulesApiOptions<TSummary, TFallback> = {
  path: string;
  body: JsonRecord;
  fallback: TFallback;
  extractFromError: (error: Error & { status?: number }, fallback: TFallback) => TSummary | null;
  formatError: (error: Error & { status?: number }) => string;
  timeoutMs: number;
  retriesOn429: number;
  maxRetries: number;
};

export async function checkRulesApi<TSummary, TFallback>(
  options: CheckRulesApiOptions<TSummary, TFallback>
): Promise<RulesApiCheckResult<TSummary>> {
  try {
    const data = await postRulesApiJson<TSummary>(options.path, options.body, {
      timeoutMs: options.timeoutMs,
      retriesOn429: options.retriesOn429,
      maxRetries: options.maxRetries,
    });
    return { ok: true, data };
  } catch (error) {
    const err = error as Error & { status?: number };
    const status = typeof err.status === "number" ? err.status : undefined;

    const recovered = options.extractFromError(err, options.fallback);
    if (recovered) return { ok: true, data: recovered };

    if (err instanceof RulesApiNotConfiguredError) {
      return { ok: false, status, error: err.message };
    }

    return { ok: false, status, error: options.formatError(err) };
  }
}
