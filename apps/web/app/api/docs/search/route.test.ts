import { afterEach, describe, expect, it, vi } from "vitest";

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

import { BuildBotAuthError } from "@/lib/server/build-bot/errors";
import { POST } from "./route";

function mockAllowedRateLimit() {
  kvGetMock.mockResolvedValue(null);
  kvSetMock.mockResolvedValue("OK");
}

describe("/api/docs/search route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("returns 401 when bearer auth fails", async () => {
    requireBuildBotBearerAuthMock.mockRejectedValue(new BuildBotAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "wallet" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 500 for unexpected auth/helper errors", async () => {
    requireBuildBotBearerAuthMock.mockRejectedValue(new Error("boom"));

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "wallet" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Internal error" });
  });

  it("returns 400 when body is malformed json", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 400 when route-specific validation fails", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("Invalid request body");
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 429 when route-level rate limit is exceeded", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });

    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    const nowSeconds = Math.floor(now / 1000);
    const windowStart = nowSeconds - (nowSeconds % 60);

    kvGetMock
      .mockResolvedValueOnce({ count: 600, windowStart })
      .mockResolvedValueOnce({ count: 1, windowStart });
    kvSetMock.mockResolvedValue("OK");

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.2",
      },
      body: JSON.stringify({ query: "wallet" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).not.toBeNull();
    expect(await response.json()).toEqual({
      ok: false,
      error: "Too many Build Bot tool requests. Please retry shortly.",
    });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 503 and Retry-After when rate limiter backend fails closed", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    kvGetMock.mockRejectedValue(new Error("kv down"));

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": "203.0.113.3",
      },
      body: JSON.stringify({ query: "wallet" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Build Bot tool rate limiting is temporarily unavailable. Please retry.",
    });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 502 when upstream chat-api request throws", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    mockAllowedRateLimit();
    fetchChatApiMock.mockRejectedValue(new Error("network down"));

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "wallet" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Upstream request failed." });
  });

  it("proxies upstream status, body, and headers on success", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    mockAllowedRateLimit();
    fetchChatApiMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          query: "wallet",
          count: 1,
          results: [{ slug: "/example", score: 0.99 }],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "cache-control": "private, max-age=60",
            "x-upstream": "chat-api",
          },
        }
      )
    );

    const request = new Request("http://localhost/api/docs/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "wallet", limit: 4 }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(response.headers.get("x-upstream")).toBe("chat-api");
    expect(await response.json()).toEqual({
      query: "wallet",
      count: 1,
      results: [{ slug: "/example", score: 0.99 }],
    });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/api/docs/search", {
      headers: { "content-type": "application/json" },
      init: {
        method: "POST",
        body: JSON.stringify({ query: "wallet", limit: 4 }),
        cache: "no-store",
      },
    });
  });
});
