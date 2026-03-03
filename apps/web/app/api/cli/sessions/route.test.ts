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

import { DELETE } from "./route";

describe("cli sessions route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for cross-origin delete requests before auth", async () => {
    const request = new Request("https://co.build/api/cli/sessions", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({ sessionId: "session-1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Forbidden" });
    expect(requireCliSessionAddressMock).not.toHaveBeenCalled();
    expect(getPrivyIdTokenMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("rejects delete with missing origin header", async () => {
    const request = new Request("https://co.build/api/cli/sessions", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ sessionId: "session-1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ ok: false, error: "Forbidden" });
    expect(requireCliSessionAddressMock).not.toHaveBeenCalled();
    expect(getPrivyIdTokenMock).not.toHaveBeenCalled();
    expect(fetchChatApiMock).not.toHaveBeenCalled();
  });

  it("allows same-origin delete and forwards JSON content-type", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const request = new Request("https://co.build/api/cli/sessions", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: "https://co.build",
      },
      body: JSON.stringify({ sessionId: "session-1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(requireCliSessionAddressMock).toHaveBeenCalledOnce();
    expect(getPrivyIdTokenMock).toHaveBeenCalledOnce();
    expect(fetchChatApiMock).toHaveBeenCalledOnce();
    expect(fetchChatApiMock).toHaveBeenCalledWith(
      "/v1/sessions",
      expect.objectContaining({
        identityToken: "id-token",
        init: expect.objectContaining({
          method: "DELETE",
          cache: "no-store",
          headers: {
            "content-type": "application/json",
          },
        }),
      })
    );
  });

  it("does not force JSON content-type when upstream response body is empty", async () => {
    requireCliSessionAddressMock.mockResolvedValue("0x0000000000000000000000000000000000000001");
    getPrivyIdTokenMock.mockResolvedValue("id-token");
    fetchChatApiMock.mockResolvedValue(
      new Response(null, {
        status: 204,
      })
    );

    const request = new Request("https://co.build/api/cli/sessions", {
      method: "DELETE",
      headers: {
        "content-type": "application/json",
        origin: "https://co.build",
      },
      body: JSON.stringify({ sessionId: "session-1" }),
    });

    const response = await DELETE(request);
    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBeNull();
  });
});
