import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireBuildBotSessionAddressMock, getPrivyIdTokenMock, fetchChatApiMock } = vi.hoisted(
  () => ({
    requireBuildBotSessionAddressMock: vi.fn(),
    getPrivyIdTokenMock: vi.fn(),
    fetchChatApiMock: vi.fn(),
  })
);

vi.mock("@/lib/server/build-bot/auth", () => ({
  requireBuildBotSessionAddress: () => requireBuildBotSessionAddressMock(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getPrivyIdToken: () => getPrivyIdTokenMock(),
}));

vi.mock("@/lib/domains/chat/server-api", () => ({
  fetchChatApi: (...args: unknown[]) => fetchChatApiMock(...args),
}));

import { BuildBotAuthError } from "@/lib/server/build-bot/errors";
import { DELETE, GET, POST } from "./route";

describe("build-bot token route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("proxies token listing to chat-api", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    getPrivyIdTokenMock.mockResolvedValue("privy-token");
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, tokens: [{ id: "1", agentKey: "default" }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      tokens: [{ id: "1", agentKey: "default" }],
    });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tokens", {
      identityToken: "privy-token",
      init: {
        method: "GET",
        cache: "no-store",
      },
    });
  });

  it("proxies token creation to chat-api", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    getPrivyIdTokenMock.mockResolvedValue("privy-token");
    fetchChatApiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          token: "bbt_example",
          tokenInfo: { id: "9", agentKey: "default", canWrite: true, label: "cli" },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "cli", agentKey: "agent-default", canWrite: true }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      token: "bbt_example",
      tokenInfo: { id: "9", agentKey: "default", canWrite: true, label: "cli" },
    });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tokens", {
      identityToken: "privy-token",
      init: {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ label: "cli", agentKey: "agent-default", canWrite: true }),
        cache: "no-store",
      },
    });
  });

  it("returns 400 when create token payload has invalid agent key", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: "cli", agentKey: "../bad" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed json on token creation", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("proxies token revocation to chat-api", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    getPrivyIdTokenMock.mockResolvedValue("privy-token");
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, revoked: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, revoked: true });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tokens", {
      identityToken: "privy-token",
      init: {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ tokenId: "1" }),
        cache: "no-store",
      },
    });
  });

  it("returns 400 for malformed json on token revocation", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );

    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await DELETE(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    requireBuildBotSessionAddressMock.mockRejectedValue(new BuildBotAuthError(401, "Unauthorized"));

    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 401 when privy token is missing", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    getPrivyIdTokenMock.mockResolvedValue(undefined);

    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 502 when upstream call throws", async () => {
    requireBuildBotSessionAddressMock.mockResolvedValue(
      "0x0000000000000000000000000000000000000001"
    );
    getPrivyIdTokenMock.mockResolvedValue("privy-token");
    fetchChatApiMock.mockRejectedValue(new Error("network down"));

    const response = await GET();
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, error: "Upstream request failed." });
  });

  it("rejects cross-origin token creation", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ label: "cli" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
  });

  it("rejects cross-origin token revocation by origin header", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin token revocation by mismatched referer", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        referer: "https://evil.example/tokens",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("rejects referers that only share an origin prefix", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        referer: "http://localhost.evil.example/tokens",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin token revocation by sec-fetch-site", async () => {
    const request = new Request("http://localhost/api/buildbot/token", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
      },
      body: JSON.stringify({ tokenId: "1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden" });
    expect(requireBuildBotSessionAddressMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });
});
