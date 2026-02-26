import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getSessionMock, generateJwtMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  generateJwtMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@coinbase/cdp-sdk/auth", () => ({
  generateJwt: (...args: Parameters<typeof generateJwtMock>) => generateJwtMock(...args),
}));

import { GET } from "./route";

describe("GET /api/onramp-status", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionMock.mockResolvedValue({});

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ tx: null, error: "Unauthorized" });
  });

  it("returns 500 when CDP keys are missing", async () => {
    getSessionMock.mockResolvedValue({ address: "0xabc" });
    process.env = { ...originalEnv, CDP_API_KEY_ID: "", CDP_API_KEY_SECRET: "" };

    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ tx: null, error: "CDP keys not configured" });
  });

  it("returns 502 when status request fails", async () => {
    getSessionMock.mockResolvedValue({ address: "0xabc" });
    process.env = { ...originalEnv, CDP_API_KEY_ID: "id", CDP_API_KEY_SECRET: "secret" };
    generateJwtMock.mockResolvedValue("jwt");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue("bad"),
      })
    );

    const res = await GET();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ tx: null, error: "status failed: bad" });
  });

  it("returns latest transaction when request succeeds", async () => {
    getSessionMock.mockResolvedValue({ address: "0xabc" });
    process.env = { ...originalEnv, CDP_API_KEY_ID: "id", CDP_API_KEY_SECRET: "secret" };
    generateJwtMock.mockResolvedValue("jwt");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          transactions: [{ transaction_id: "tx-1", status: "ONRAMP_TRANSACTION_STATUS_SUCCESS" }],
        }),
      })
    );

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tx: { transaction_id: "tx-1", status: "ONRAMP_TRANSACTION_STATUS_SUCCESS" },
    });
  });
});
