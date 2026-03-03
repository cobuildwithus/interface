import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { forbiddenCrossOriginResponse, isSameOriginRequest } from "./same-origin";

const BASE_URL = "https://co.build";

function buildRequest(headers: HeadersInit = {}) {
  return new Request(`${BASE_URL}/api/cli/sessions`, {
    method: "DELETE",
    headers,
  });
}

describe("same-origin helpers", () => {
  it("accepts matching origin headers", () => {
    const request = buildRequest({ origin: BASE_URL });
    expect(isSameOriginRequest(request)).toBe(true);
    expect(forbiddenCrossOriginResponse(request)).toBeNull();
  });

  it("rejects mismatched origin headers", async () => {
    const request = buildRequest({ origin: "https://evil.example" });
    expect(isSameOriginRequest(request)).toBe(false);

    const response = forbiddenCrossOriginResponse(request);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ ok: false, error: "Forbidden" });
  });

  it("rejects malformed referer when origin is absent", () => {
    const request = buildRequest({ referer: "://bad-url" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects cross-origin referer when origin is absent", () => {
    const request = buildRequest({ referer: "https://evil.example/attack" });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("rejects cross-site sec-fetch-site values", () => {
    const request = buildRequest({
      origin: BASE_URL,
      "sec-fetch-site": "cross-site",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });

  it("accepts same-site sec-fetch-site with same-origin referer", () => {
    const request = buildRequest({
      referer: `${BASE_URL}/oauth/authorize`,
      "sec-fetch-site": "same-site",
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("accepts missing origin and referer to preserve route behavior", () => {
    const request = buildRequest();
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects missing origin when strict mode requires it", () => {
    const request = buildRequest();
    expect(isSameOriginRequest(request, { requireOriginHeader: true })).toBe(false);
    const response = forbiddenCrossOriginResponse(request, { requireOriginHeader: true });
    expect(response?.status).toBe(403);
  });

  it("accepts strict mode when origin is present and same-origin", () => {
    const request = buildRequest({ origin: BASE_URL });
    expect(isSameOriginRequest(request, { requireOriginHeader: true })).toBe(true);
    expect(forbiddenCrossOriginResponse(request, { requireOriginHeader: true })).toBeNull();
  });
});
