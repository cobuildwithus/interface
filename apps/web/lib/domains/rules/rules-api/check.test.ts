import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/domains/rules/rules-api/post-json", () => {
  class RulesApiNotConfiguredError extends Error {
    constructor() {
      super("Cast rules API not configured.");
      this.name = "RulesApiNotConfiguredError";
    }
  }

  return {
    RulesApiNotConfiguredError,
    postRulesApiJson: vi.fn(),
  };
});

import {
  postRulesApiJson,
  RulesApiNotConfiguredError,
} from "@/lib/domains/rules/rules-api/post-json";

import { checkRulesApi } from "./check";

describe("rules-api/checkRulesApi", () => {
  it("returns ok for successful calls", async () => {
    vi.mocked(postRulesApiJson).mockResolvedValue({ ok: true } as never);

    await expect(
      checkRulesApi({
        path: "/v1/check",
        body: { x: 1 },
        fallback: { ok: false },
        extractFromError: () => null,
        formatError: () => "formatted",
        timeoutMs: 1,
        retriesOn429: 0,
        maxRetries: 0,
      })
    ).resolves.toEqual({ ok: true, data: { ok: true } });
  });

  it("recovers via extractFromError", async () => {
    vi.mocked(postRulesApiJson).mockRejectedValue(
      Object.assign(new Error("HTTP 400"), { status: 400 })
    );

    await expect(
      checkRulesApi({
        path: "/v1/check",
        body: {},
        fallback: { ok: false },
        extractFromError: (_err, fallback) => ({ recovered: true, fallback }),
        formatError: () => "formatted",
        timeoutMs: 1,
        retriesOn429: 0,
        maxRetries: 0,
      })
    ).resolves.toEqual({ ok: true, data: { recovered: true, fallback: { ok: false } } });
  });

  it("returns not-configured errors", async () => {
    vi.mocked(postRulesApiJson).mockRejectedValue(new RulesApiNotConfiguredError());

    await expect(
      checkRulesApi({
        path: "/v1/check",
        body: {},
        fallback: null,
        extractFromError: () => null,
        formatError: () => "formatted",
        timeoutMs: 1,
        retriesOn429: 0,
        maxRetries: 0,
      })
    ).resolves.toEqual({ ok: false, status: undefined, error: "Cast rules API not configured." });
  });

  it("formats other errors", async () => {
    vi.mocked(postRulesApiJson).mockRejectedValue(
      Object.assign(new Error("boom"), { status: 418 })
    );

    await expect(
      checkRulesApi({
        path: "/v1/check",
        body: {},
        fallback: null,
        extractFromError: () => null,
        formatError: (e) => `fmt:${e.message}`,
        timeoutMs: 1,
        retriesOn429: 0,
        maxRetries: 0,
      })
    ).resolves.toEqual({ ok: false, status: 418, error: "fmt:boom" });
  });
});
