import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { GET } from "./route";

describe("/v1/tools route", () => {
  beforeEach(() => {
    kvIncrMock.mockResolvedValue(1);
    kvExpireMock.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("returns 401 when bearer auth fails", async () => {
    const request = new Request("http://localhost/v1/tools", {
      method: "GET",
    });

    const response = await GET(request);
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("proxies query params and upstream response", async () => {
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, tools: [{ name: "docs-search" }] }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "private, max-age=60",
          "x-upstream": "chat-api",
        },
      })
    );

    const request = new Request("http://localhost/v1/tools?cursor=next%201", {
      method: "GET",
      headers: {
        authorization: "Bearer bbt_test_token",
      },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(response.headers.get("x-upstream")).toBe("chat-api");
    expect(await response.json()).toEqual({ ok: true, tools: [{ name: "docs-search" }] });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tools?cursor=next%201", {
      headers: {
        authorization: "Bearer bbt_test_token",
      },
      init: {
        method: "GET",
        cache: "no-store",
      },
    });
  });
});
