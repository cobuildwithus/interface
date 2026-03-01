import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireBuildBotBearerAuthMock, fetchChatApiMock, kvGetMock, kvSetMock } = vi.hoisted(
  () => ({
    requireBuildBotBearerAuthMock: vi.fn(),
    fetchChatApiMock: vi.fn(),
    kvGetMock: vi.fn(),
    kvSetMock: vi.fn(),
  })
);

vi.mock("@/lib/server/build-bot/auth", () => ({
  requireBuildBotBearerAuth: (...args: unknown[]) => requireBuildBotBearerAuthMock(...args),
}));

vi.mock("@/lib/domains/chat/server-api", () => ({
  fetchChatApi: (...args: unknown[]) => fetchChatApiMock(...args),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    get: (...args: unknown[]) => kvGetMock(...args),
    set: (...args: unknown[]) => kvSetMock(...args),
  },
}));

import { POST } from "./route";

describe("/api/buildbot/tools/cast-preview route", () => {
  beforeEach(() => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    kvGetMock.mockResolvedValue(null);
    kvSetMock.mockResolvedValue("OK");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when embeds exceed route limit", async () => {
    const request = new Request("http://localhost/api/buildbot/tools/cast-preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "hello",
        embeds: [
          { url: "https://a.example" },
          { url: "https://b.example" },
          { url: "https://c.example" },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("Invalid request body");
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("forwards validated payload to upstream", async () => {
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, cast: { text: "hello" } }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": "no-store" },
      })
    );

    const request = new Request("http://localhost/api/buildbot/tools/cast-preview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "hello",
        embeds: [{ url: "https://a.example" }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, cast: { text: "hello" } });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/api/buildbot/tools/cast-preview", {
      headers: { "content-type": "application/json" },
      init: {
        method: "POST",
        body: JSON.stringify({
          text: "hello",
          embeds: [{ url: "https://a.example" }],
        }),
        cache: "no-store",
      },
    });
  });
});
