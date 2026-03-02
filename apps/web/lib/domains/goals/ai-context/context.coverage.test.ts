import { beforeEach, describe, expect, it, vi } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

vi.mock("server-only", () => ({}));

const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;
vi.mock("next/cache", () => ({
  unstable_cache: passthroughCache,
}));

const fetchChatApiMock = vi.fn();

vi.mock("@/lib/domains/chat/server-api", () => ({
  fetchChatApi: (...args: Parameters<typeof fetchChatApiMock>) => fetchChatApiMock(...args),
}));

vi.mock("@/lib/domains/chat/api", () => ({
  chatApiBase: "https://chat.example",
}));

describe("goal-ai-context", () => {
  beforeEach(() => {
    fetchChatApiMock.mockReset();
  });

  it("fetches context from chat-api and rewrites prompt endpoint", async () => {
    fetchChatApiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          goalAddress: "",
          asOf: "2026-03-02T00:00:00.000Z",
          asOfMs: 1_700_000_000_000,
          prompt: "upstream prompt",
          data: {
            baseAsset: {},
            token: {},
            treasury: {},
            issuance: {},
            mints: {},
            holders: {},
            distribution: {},
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const { getCobuildAiContext } = await import("./context");
    const result = await getCobuildAiContext();

    expect(fetchChatApiMock).toHaveBeenCalledWith("/api/cobuild/ai-context", {
      init: {
        method: "GET",
        cache: "no-store",
      },
    });
    expect(result.prompt).toContain("https://chat.example/api/cobuild/ai-context");
  });

  it("throws when chat-api returns a non-200 response", async () => {
    fetchChatApiMock.mockResolvedValue(new Response("boom", { status: 502 }));
    const { getCobuildAiContext } = await import("./context");

    await expect(getCobuildAiContext()).rejects.toThrow("Chat API context request failed (502).");
  });
});
