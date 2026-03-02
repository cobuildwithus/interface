import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { kvIncrMock, kvExpireMock } = vi.hoisted(() => ({
  kvIncrMock: vi.fn(),
  kvExpireMock: vi.fn(),
}));

vi.mock("@vercel/kv", () => ({
  kv: {
    incr: (...args: unknown[]) => kvIncrMock(...args),
    expire: (...args: unknown[]) => kvExpireMock(...args),
  },
}));

import { enforceBuildBotFarcasterX402RateLimit } from "./farcaster-x402-rate-limit";

describe("enforceBuildBotFarcasterX402RateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BUILD_BOT_FARCASTER_X402_RATE_LIMIT_PER_MINUTE = "60";
    process.env.BUILD_BOT_FARCASTER_X402_MAX_CALLS_PER_DAY = "10000";
  });

  afterEach(() => {
    delete process.env.BUILD_BOT_FARCASTER_X402_RATE_LIMIT_PER_MINUTE;
    delete process.env.BUILD_BOT_FARCASTER_X402_MAX_CALLS_PER_DAY;
  });

  it("uses atomic kv.incr windows and allows requests within limits", async () => {
    kvIncrMock.mockResolvedValue(1);
    kvExpireMock.mockResolvedValue(1);

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: {
        "x-forwarded-for": "203.0.113.10",
      },
    });

    const result = await enforceBuildBotFarcasterX402RateLimit({
      request,
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "42",
      agentKey: "default",
    });

    expect(result).toEqual({ allowed: true });
    expect(kvIncrMock).toHaveBeenCalledTimes(4);
    expect(kvExpireMock).toHaveBeenCalledTimes(4);
  });

  it("returns daily cap errors when the token daily limit is exceeded", async () => {
    process.env.BUILD_BOT_FARCASTER_X402_MAX_CALLS_PER_DAY = "2";
    kvIncrMock
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3);
    kvExpireMock.mockResolvedValue(1);

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
    });

    const result = await enforceBuildBotFarcasterX402RateLimit({
      request,
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "42",
      agentKey: "default",
    });

    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(result.status).toBe(429);
    expect(result.error).toBe("Daily Farcaster x402 payment cap reached. Please retry tomorrow.");
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
