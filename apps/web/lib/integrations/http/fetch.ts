import pRetry from "p-retry";
import type { JsonRecord, JsonValue } from "@/lib/shared/json";

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES_ON_429 = 6;
const MIN_BUFFER_MS_ON_429 = 800;

interface HttpError extends Error {
  status: number;
  retryAfterMs?: number;
  meta?: { detail?: JsonValue; headerRetryAfter?: string | null };
}

interface TimeoutError extends Error {
  code: string;
}

function parseRetryAfterSeconds(
  detail: JsonValue | undefined,
  headerValue: string | null
): number | null {
  if (headerValue) {
    const headerSeconds = Number.parseFloat(headerValue);
    if (Number.isFinite(headerSeconds) && headerSeconds > 0) return headerSeconds;
  }
  if (typeof detail === "string") {
    const match = detail.match(/after\s+([\d.]+)\s+seconds?/i);
    if (match) {
      const seconds = Number.parseFloat(match[1]);
      if (Number.isFinite(seconds) && seconds > 0) return seconds;
    }
  }
  return null;
}

async function sleep(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number; retriesOn429?: number } = {}
): Promise<T> {
  const { timeoutMs, retriesOn429, ...restInit } = init;
  const maxRetries = Math.max(0, retriesOn429 ?? DEFAULT_RETRIES_ON_429);

  const result = await pRetry<T>(
    async () => {
      const controller = new AbortController();
      const externalSignal = init?.signal as AbortSignal | undefined;
      if (externalSignal) {
        if (externalSignal.aborted) controller.abort(externalSignal.reason);
        else
          externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason), {
            once: true,
          });
      }

      const t = setTimeout(() => controller.abort(), timeoutMs ?? DEFAULT_TIMEOUT_MS);
      try {
        const res = await fetch(url, { ...restInit, signal: controller.signal });

        let json: JsonValue | undefined = undefined;
        try {
          json = await res.json();
        } catch {
          console.error(`[fetchJsonWithTimeout] error parsing json for url ${url}`);
          if (res.ok) {
            throw new Error("JSON parse failed");
          }
          json = undefined;
        }

        if (res.ok) return json as T;

        if (res.status === 429) {
          const detail = (json as JsonRecord | undefined)?.detail;
          const headerRetryAfter = res.headers.get("retry-after");
          const delaySeconds = parseRetryAfterSeconds(detail, headerRetryAfter);
          const retryAfterMs =
            delaySeconds && delaySeconds > 0 ? Math.ceil(delaySeconds * 1000) : undefined;

          const error: HttpError = Object.assign(new Error("Too Many Requests"), {
            status: 429,
            retryAfterMs,
            meta: { detail, headerRetryAfter },
          });
          throw error;
        }

        const err: HttpError = Object.assign(
          new Error(
            `HTTP ${res.status}: ${JSON.stringify((json as JsonRecord | undefined)?.errors ?? json)}`
          ),
          { status: res.status }
        );
        throw err;
      } catch (e) {
        const err = e as Error & { name?: string };
        if (err && err.name === "AbortError") {
          const timeoutErr: TimeoutError = Object.assign(new Error("Request timed out"), {
            code: "ATTEMPT_TIMEOUT",
          });
          throw timeoutErr;
        }
        throw err;
      } finally {
        clearTimeout(t);
      }
    },
    {
      retries: maxRetries,
      factor: 1,
      minTimeout: 0,
      randomize: false,
      shouldRetry: ({ error }) => (error as { status?: number } | undefined)?.status === 429,
      onFailedAttempt: async ({ error, attemptNumber }) => {
        const e = error as {
          retryAfterMs?: number;
          meta?: { detail?: JsonValue; headerRetryAfter?: string | null };
        };
        const parsedDelayMs = e.retryAfterMs && e.retryAfterMs > 0 ? Math.ceil(e.retryAfterMs) : 0;
        const fallbackDelayMs = Math.min(6000, 1000 * Math.pow(2, attemptNumber - 1));
        const proportionalBufferMs = Math.floor(parsedDelayMs * 0.25);
        const extraBufferMs = Math.max(MIN_BUFFER_MS_ON_429, proportionalBufferMs);
        const jitterMs = Math.floor(Math.random() * 200);
        const waitMs =
          (parsedDelayMs > 0 ? parsedDelayMs : fallbackDelayMs) + extraBufferMs + jitterMs;

        const details = [] as string[];
        const headerRetryAfter = e.meta?.headerRetryAfter ?? null;
        const detail = e.meta?.detail;
        if (headerRetryAfter) details.push(`retry-after: ${headerRetryAfter}`);
        if (detail) details.push(`detail: ${String(detail)}`);
        const detailsStr = details.length > 0 ? ` (${details.join(", ")})` : "";

        console.log(`[fetchJsonWithTimeout] url ${url} returned 429, retrying...${detailsStr}`);
        console.log(
          `[fetchJsonWithTimeout] waiting ${waitMs}ms before retry (attempt ${attemptNumber}/${maxRetries})`
        );
        await sleep(waitMs);
      },
    }
  );

  return result;
}
