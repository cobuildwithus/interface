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

describe("/v1/tools/:name route", () => {
  beforeEach(() => {
    kvIncrMock.mockResolvedValue(1);
    kvExpireMock.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("encodes the tool name and proxies upstream response", async () => {
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, name: "get cast" }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      })
    );

    const request = new Request("http://localhost/v1/tools/get%20cast?version=2", {
      method: "GET",
      headers: {
        authorization: "Bearer bbt_test_token",
      },
    });

    const response = await GET(request, { params: Promise.resolve({ name: "get cast" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true, name: "get cast" });
    expect(fetchChatApiMock).toHaveBeenCalledWith("/v1/tools/get%20cast?version=2", {
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
