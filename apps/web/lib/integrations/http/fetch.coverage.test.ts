import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

type RetryOptions = {
  onFailedAttempt?: (context: {
    error: Error & { status?: number };
    attemptNumber: number;
  }) => void | Promise<void>;
  shouldRetry?: (context: { error: { status?: number } }) => boolean;
};

const pRetryMock = vi.hoisted(() =>
  vi.fn(async <T>(fn: () => Promise<T> | T, options?: RetryOptions): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      const err = error as { status?: number };
      const status = typeof err === "object" && err ? err.status : undefined;
      if (options?.onFailedAttempt && status === 429) {
        await options.onFailedAttempt({
          error: err as Error & { status?: number },
          attemptNumber: 1,
        });
      }
      throw error;
    }
  })
);

vi.mock("p-retry", () => ({ default: pRetryMock }));

import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";

describe("fetchJsonWithTimeout", () => {
  beforeEach(() => {
    pRetryMock.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns JSON on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => ({ ok: true }) }));

    await expect(fetchJsonWithTimeout("/ok")).resolves.toEqual({ ok: true });
  });

  it("throws with status for non-429", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => ({}) }));

    await expect(fetchJsonWithTimeout("/bad")).rejects.toMatchObject({ status: 500 });
  });

  it("parses retry-after for 429 and logs", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const headers = { get: vi.fn().mockReturnValue("1") };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers,
        json: () => ({ detail: "retry after 1 seconds" }),
      })
    );

    await expect(fetchJsonWithTimeout("/429")).rejects.toMatchObject({ status: 429 });

    expect(logSpy).toHaveBeenCalled();
  });

  it("handles 429 without retry-after metadata", async () => {
    const headers = { get: vi.fn().mockReturnValue(null) };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers,
        json: () => ({}),
      })
    );

    await expect(fetchJsonWithTimeout("/429-no-detail")).rejects.toMatchObject({ status: 429 });
  });

  it("throws on json parse when ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => {
          throw new Error("bad json");
        },
      })
    );

    await expect(fetchJsonWithTimeout("/bad-json")).rejects.toThrow("JSON parse failed");
  });

  it("throws on json parse when not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => {
          throw new Error("bad json");
        },
      })
    );

    await expect(fetchJsonWithTimeout("/bad-json-error")).rejects.toMatchObject({ status: 400 });
  });

  it("wraps AbortError as timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(Object.assign(new Error("abort"), { name: "AbortError" }))
    );

    await expect(fetchJsonWithTimeout("/timeout")).rejects.toMatchObject({
      code: "ATTEMPT_TIMEOUT",
    });
  });

  it("handles external abort signals and shouldRetry helper", async () => {
    const external = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url, init) => {
        const signal = init?.signal as AbortSignal | undefined;
        return new Promise((_resolve, reject) => {
          if (!signal) return reject(new Error("missing signal"));
          signal.addEventListener(
            "abort",
            () => reject(Object.assign(new Error("abort"), { name: "AbortError" })),
            { once: true }
          );
        });
      })
    );

    const promise = fetchJsonWithTimeout("/abort", { signal: external.signal, timeoutMs: 1000 });
    external.abort("stop");

    await expect(promise).rejects.toMatchObject({ code: "ATTEMPT_TIMEOUT" });

    const options = pRetryMock.mock.calls[0]?.[1] as RetryOptions;
    const shouldRetry = options.shouldRetry ?? (() => false);
    expect(shouldRetry({ error: { status: 429 } })).toBe(true);
    expect(shouldRetry({ error: { status: 500 } })).toBe(false);
  });
});
