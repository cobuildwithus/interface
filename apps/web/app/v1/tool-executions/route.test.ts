import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { fetchChatApiMock, kvIncrMock, kvExpireMock } = vi.hoisted(() => ({
  fetchChatApiMock: vi.fn(),
  kvIncrMock: vi.fn(),
  kvExpireMock: vi.fn(),
}));

vi.mock("@/lib/domains/chat/server-api", () => ({
  fetchChatApi: (...args: unknown[]) => fetchChatApiMock(...args),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    incr: (...args: unknown[]) => kvIncrMock(...args),
    expire: (...args: unknown[]) => kvExpireMock(...args),
  },
}));

import { POST } from "./route";

function mockAllowedRateLimit() {
  kvIncrMock.mockResolvedValue(1);
  kvExpireMock.mockResolvedValue(1);
}

describe("/v1/tool-executions route", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    delete process.env.BUILD_BOT_TOOLS_RATE_LIMIT_MODE;
  });

  it("returns 401 when bearer auth fails", async () => {
    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "docs-search", input: { query: "wallet" } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 429 when route-level rate limit is exceeded", async () => {
    const now = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(now);
    kvIncrMock.mockResolvedValueOnce(601).mockResolvedValueOnce(1);
    kvExpireMock.mockResolvedValue(1);

    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
        "x-forwarded-for": "203.0.113.2",
      },
      body: JSON.stringify({ name: "docs-search", input: { query: "wallet" } }),
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

  it("fails open by default when rate limiter backend is unavailable", async () => {
    kvIncrMock.mockRejectedValue(new Error("kv down"));
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, name: "docs-search", output: { count: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
        "x-real-ip": "203.0.113.3",
      },
      body: JSON.stringify({ name: "docs-search", input: { query: "wallet" } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      name: "docs-search",
      output: { count: 1 },
    });
  });

  it("returns 503 and Retry-After when rate limiter is configured fail-closed", async () => {
    process.env.BUILD_BOT_TOOLS_RATE_LIMIT_MODE = "fail-closed";
    kvIncrMock.mockRejectedValue(new Error("kv down"));

    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
        "x-real-ip": "203.0.113.3",
      },
      body: JSON.stringify({ name: "docs-search", input: { query: "wallet" } }),
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
    mockAllowedRateLimit();
    fetchChatApiMock.mockRejectedValue(new Error("network down"));

    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
      },
      body: JSON.stringify({ name: "docs-search", input: { query: "wallet" } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Upstream request failed." });
  });

  it("returns 413 when tool execution body exceeds the size limit", async () => {
    mockAllowedRateLimit();
    const oversizedQuery = "x".repeat(64 * 1024);
    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
      },
      body: JSON.stringify({ name: "docs-search", input: { query: oversizedQuery } }),
    });

    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: false,
      error: "Tool execution request body exceeds the 64KB limit.",
    });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("proxies upstream status, body, and headers", async () => {
    mockAllowedRateLimit();
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, name: "docs-search", output: { count: 1 } }), {
        status: 202,
        headers: {
          "content-type": "application/json",
          "cache-control": "private, max-age=30",
          "x-upstream": "chat-api",
        },
      })
    );

    const requestBody = JSON.stringify({ name: "docs-search", input: { query: "wallet" } });
    const request = new Request("http://localhost/v1/tool-executions?stream=false", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
      },
      body: requestBody,
    });

    const response = await POST(request);
    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("private, max-age=30");
    expect(response.headers.get("x-upstream")).toBe("chat-api");
    expect(await response.json()).toEqual({ ok: true, name: "docs-search", output: { count: 1 } });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tool-executions?stream=false", {
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
      },
      init: {
        method: "POST",
        body: requestBody,
        cache: "no-store",
      },
    });
  });

  it("defaults content-type to application/json when omitted by the client", async () => {
    mockAllowedRateLimit();
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, name: "docs-search", output: { count: 1 } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const requestBody = JSON.stringify({ name: "docs-search", input: { query: "wallet" } });
    const request = new Request("http://localhost/v1/tool-executions", {
      method: "POST",
      headers: {
        authorization: "Bearer bbt_test_token",
        "content-type": "",
      },
      body: requestBody,
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tool-executions", {
      headers: {
        "content-type": "application/json",
        authorization: "Bearer bbt_test_token",
      },
      init: {
        method: "POST",
        body: requestBody,
        cache: "no-store",
      },
    });
  });
});
