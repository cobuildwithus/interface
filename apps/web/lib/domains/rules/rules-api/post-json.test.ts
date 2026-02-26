import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/integrations/http/fetch", () => ({
  fetchJsonWithTimeout: vi.fn(),
}));

import { fetchJsonWithTimeout } from "@/lib/integrations/http/fetch";

import { postRulesApiJson, RulesApiNotConfiguredError } from "./post-json";

describe("rules-api/postRulesApiJson", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when not configured", async () => {
    delete process.env.CAST_RULES_API_URL;
    delete process.env.CAST_RULES_API_KEY;

    await expect(postRulesApiJson("/v1/x", {})).rejects.toBeInstanceOf(RulesApiNotConfiguredError);
    expect(vi.mocked(fetchJsonWithTimeout)).not.toHaveBeenCalled();
  });

  it("posts JSON to the configured endpoint", async () => {
    process.env.CAST_RULES_API_URL = "https://api.example.com/";
    process.env.CAST_RULES_API_KEY = "secret";
    vi.mocked(fetchJsonWithTimeout).mockResolvedValue({ ok: true } as never);

    await expect(
      postRulesApiJson<{ ok: boolean }>(
        "v1/check",
        { hello: "world" },
        { maxRetries: 0, retriesOn429: 0, timeoutMs: 1 }
      )
    ).resolves.toEqual({ ok: true });

    expect(vi.mocked(fetchJsonWithTimeout)).toHaveBeenCalledWith(
      "https://api.example.com/v1/check",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-api-key": "secret" }),
        body: JSON.stringify({ hello: "world" }),
        timeoutMs: 1,
        retriesOn429: 0,
      })
    );
  });

  it("handles leading slashes and default options", async () => {
    process.env.CAST_RULES_API_URL = "https://api.example.com";
    process.env.CAST_RULES_API_KEY = "secret";
    vi.mocked(fetchJsonWithTimeout).mockResolvedValue({ ok: true } as never);

    await expect(
      postRulesApiJson<{ ok: boolean }>("/v1/check", { hello: "world" })
    ).resolves.toEqual({ ok: true });

    expect(vi.mocked(fetchJsonWithTimeout)).toHaveBeenCalledWith(
      "https://api.example.com/v1/check",
      expect.objectContaining({
        timeoutMs: 40000,
        retriesOn429: 8,
      })
    );
  });
});
