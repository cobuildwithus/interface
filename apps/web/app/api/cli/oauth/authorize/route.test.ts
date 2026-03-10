import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getPrivyIdTokenMock, fetchChatApiMock, requireCliSessionAddressMock } = vi.hoisted(() => ({
  getPrivyIdTokenMock: vi.fn(),
  fetchChatApiMock: vi.fn(),
  requireCliSessionAddressMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getPrivyIdToken: (...args: unknown[]) => getPrivyIdTokenMock(...args),
}));

vi.mock("@/lib/domains/chat/server-api", () => ({
  fetchChatApi: (...args: unknown[]) => fetchChatApiMock(...args),
}));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliSessionAddress: (...args: unknown[]) => requireCliSessionAddressMock(...args),
}));

import { POST } from "./route";

const BASE_BODY = {
  responseType: "code",
  clientId: "cli",
  redirectUri: "http://127.0.0.1:43111/auth/callback",
  scope: "tools:read tools:write wallet:read wallet:execute offline_access",
  codeChallenge: "A".repeat(43),
  codeChallengeMethod: "S256",
  state: "state1234",
  agentKey: "default",
};

function createAuthorizeRequest(body: Record<string, unknown>, origin = "https://co.build") {
  return new Request("https://co.build/api/cli/oauth/authorize", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(origin ? { origin } : {}),
    },
    body: JSON.stringify(body),
  });
}

function createUpstreamAuthorizeResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("cli oauth authorize route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for cross-origin requests before auth", async () => {
    const request = new Request("https://co.build/api/cli/oauth/authorize", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify(BASE_BODY),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Forbidden" });
    expect(requireCliSessionAddressMock).not.toHaveBeenCalled();
    expect(getPrivyIdTokenMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("builds redirect using validated request redirect/state values", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      createUpstreamAuthorizeResponse({
        code: "auth-code-1",
        state: "state1234",
        redirect_uri: "http://127.0.0.1:43111/auth/callback",
        expires_in: 300,
      })
    );

    const request = createAuthorizeRequest(BASE_BODY);

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchChatApiMock).toHaveBeenCalledOnce();
    expect(fetchChatApiMock).toHaveBeenCalledWith("/oauth/authorize-code", {
      identityToken: "id-token",
      init: expect.objectContaining({
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_id: "cli",
          redirect_uri: "http://127.0.0.1:43111/auth/callback",
          scope: "offline_access tools:read tools:write wallet:execute wallet:read",
          code_challenge: "A".repeat(43),
          code_challenge_method: "S256",
          state: "state1234",
          agent_key: "default",
        }),
      }),
    });

    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(typeof payload.redirectTo).toBe("string");

    const redirect = new URL(payload.redirectTo as string);
    expect(redirect.origin).toBe("http://127.0.0.1:43111");
    expect(redirect.pathname).toBe("/auth/callback");
    expect(redirect.searchParams.get("code")).toBe("auth-code-1");
    expect(redirect.searchParams.get("state")).toBe("state1234");
  });

  it("rejects requests that omit origin header", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      createUpstreamAuthorizeResponse({
        code: "auth-code-3",
        state: "state1234",
        redirect_uri: "http://127.0.0.1:43111/auth/callback",
        expires_in: 300,
      })
    );

    const request = createAuthorizeRequest(BASE_BODY, "");

    const response = await POST(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Forbidden" });
    expect(requireCliSessionAddressMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("returns 400 when request validation fails before upstream fetch", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");

    const request = createAuthorizeRequest({
      ...BASE_BODY,
      state: "",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "state is invalid",
    });
    expect(getPrivyIdTokenMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("rejects upstream mismatched state", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      createUpstreamAuthorizeResponse({
        code: "auth-code-2",
        state: "unexpected-state",
        redirect_uri: "http://127.0.0.1:43111/auth/callback",
        expires_in: 300,
      })
    );

    const request = createAuthorizeRequest(BASE_BODY);

    const response = await POST(request);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Upstream state did not match authorization request.",
    });
  });

  it("rejects upstream mismatched redirect_uri", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      createUpstreamAuthorizeResponse({
        code: "auth-code-4",
        state: "state1234",
        redirect_uri: "http://127.0.0.1:50000/auth/callback",
        expires_in: 300,
      })
    );

    const response = await POST(createAuthorizeRequest(BASE_BODY));
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Upstream redirect URI did not match authorization request.",
    });
  });

  it("returns 502 when upstream success payload is malformed", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      createUpstreamAuthorizeResponse({
        code: "auth-code-5",
        redirect_uri: "http://127.0.0.1:43111/auth/callback",
        expires_in: 300,
      })
    );

    const response = await POST(createAuthorizeRequest(BASE_BODY));
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "OAuth authorize response did not include state.",
    });
  });
});
