import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getUserMock, markNotificationsReadMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  markNotificationsReadMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getUser: (...args: Parameters<typeof getUserMock>) => getUserMock(...args),
}));

vi.mock("@/lib/domains/notifications/queries", () => ({
  NOTIFICATION_WATERMARK_PATTERN: /^[0-9]{1,20}$/,
  markNotificationsRead: (...args: Parameters<typeof markNotificationsReadMock>) =>
    markNotificationsReadMock(...args),
}));

import { POST } from "./route";

function buildRequest(
  url: string,
  init: {
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Request & { nextUrl: URL } {
  const request = new Request(url, {
    method: "POST",
    headers: init.headers,
    body: init.body,
  });
  (request as Request & { nextUrl: URL }).nextUrl = new URL(url);
  return request as Request & { nextUrl: URL };
}

describe("POST /api/notifications/read", () => {
  const baseUrl = "http://localhost";

  beforeEach(() => {
    getUserMock.mockReset();
    markNotificationsReadMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects cross-origin requests", async () => {
    const response = await POST(
      buildRequest(`${baseUrl}/api/notifications/read`, {
        headers: { origin: "https://evil.com" },
        body: JSON.stringify({ watermark: new Date().toISOString() }),
      }) as never
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "Forbidden." });
  });

  it("rejects unauthenticated requests", async () => {
    getUserMock.mockResolvedValue(null);

    const response = await POST(
      buildRequest(`${baseUrl}/api/notifications/read`, {
        headers: { origin: baseUrl, "content-type": "application/json" },
        body: JSON.stringify({ watermark: new Date().toISOString() }),
      }) as never
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized." });
  });

  it("rejects invalid JSON bodies", async () => {
    getUserMock.mockResolvedValue("0x0000000000000000000000000000000000000001");

    const response = await POST(
      buildRequest(`${baseUrl}/api/notifications/read`, {
        headers: { origin: baseUrl, "content-type": "application/json" },
        body: "{",
      }) as never
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  it("marks notifications read when the watermark is valid", async () => {
    const watermark = "1741435200000001";
    getUserMock.mockResolvedValue("0x0000000000000000000000000000000000000001");

    const response = await POST(
      buildRequest(`${baseUrl}/api/notifications/read`, {
        headers: { origin: baseUrl, "content-type": "application/json" },
        body: JSON.stringify({ watermark }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(markNotificationsReadMock).toHaveBeenCalledWith(
      "0x0000000000000000000000000000000000000001",
      watermark
    );
    expect(await response.json()).toEqual({ ok: true, readAt: watermark });
  });

  it("rejects malformed watermark strings", async () => {
    getUserMock.mockResolvedValue("0x0000000000000000000000000000000000000001");

    const response = await POST(
      buildRequest(`${baseUrl}/api/notifications/read`, {
        headers: { origin: baseUrl, "content-type": "application/json" },
        body: JSON.stringify({ watermark: "2026-03-08T12:00:00.000Z" }),
      }) as never
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid watermark." });
    expect(markNotificationsReadMock).not.toHaveBeenCalled();
  });
});
