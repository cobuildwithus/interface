import "server-only";

import pRetry from "p-retry";
import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";
import type { JsonRecord } from "@/lib/shared/json";

const DEFAULT_TIMEOUT_MS = 40_000;
const DEFAULT_RETRIES_ON_429 = 8;
const DEFAULT_MAX_RETRIES = 1;

export class RulesApiNotConfiguredError extends Error {
  constructor() {
    super("Cast rules API not configured.");
    this.name = "RulesApiNotConfiguredError";
  }
}

type PostRulesApiJsonOptions = {
  timeoutMs?: number;
  retriesOn429?: number;
  maxRetries?: number;
};

export async function postRulesApiJson<T>(
  path: string,
  body: JsonRecord,
  options: PostRulesApiJsonOptions = {}
): Promise<T> {
  const apiUrl = process.env.CAST_RULES_API_URL;
  const apiKey = process.env.CAST_RULES_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new RulesApiNotConfiguredError();
  }

  const endpoint = `${apiUrl.replace(/\/+$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;

  const executeRequest = async (): Promise<T> => {
    return await fetchJsonWithTimeout<T>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      retriesOn429: options.retriesOn429 ?? DEFAULT_RETRIES_ON_429,
      body: JSON.stringify(body),
    });
  };

  return await pRetry(executeRequest, {
    retries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    factor: 1,
  });
}
