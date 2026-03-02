import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  requireBuildBotBearerAuthMock,
  createBuildBotFarcasterX402PaymentMock,
  enforceRateLimitMock,
} = vi.hoisted(() => ({
  requireBuildBotBearerAuthMock: vi.fn(),
  createBuildBotFarcasterX402PaymentMock: vi.fn(),
  enforceRateLimitMock: vi.fn(),
}));

vi.mock("@/lib/server/build-bot/auth", () => ({
  requireBuildBotBearerAuth: (...args: unknown[]) => requireBuildBotBearerAuthMock(...args),
}));

vi.mock("@/lib/server/build-bot/farcaster-x402", () => ({
  createBuildBotFarcasterX402Payment: (...args: unknown[]) =>
    createBuildBotFarcasterX402PaymentMock(...args),
  BuildBotFarcasterX402SigningError: class BuildBotFarcasterX402SigningError extends Error {},
}));

vi.mock("@/lib/server/build-bot/farcaster-x402-rate-limit", () => ({
  enforceBuildBotFarcasterX402RateLimit: (...args: unknown[]) => enforceRateLimitMock(...args),
}));

import { BuildBotAuthError, BuildBotPolicyError } from "@/lib/server/build-bot/errors";
import { BuildBotFarcasterX402SigningError } from "@/lib/server/build-bot/farcaster-x402";
import { POST } from "./route";

describe("build-bot farcaster x402 payment route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const allowRateLimit = () => {
    enforceRateLimitMock.mockResolvedValue({ allowed: true });
  };

  it("returns x402 payment payload", async () => {
    allowRateLimit();
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createBuildBotFarcasterX402PaymentMock.mockResolvedValue({
      xPayment: "base64-payload",
      payerAddress: "0x0000000000000000000000000000000000000002",
      payTo: "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      amount: "1000",
      network: "base",
      validAfter: 0,
      validBefore: 1_700_000_000,
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: "8e03978e-40d5-43e8-bc93-6894a57f9324",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      result: {
        xPayment: "base64-payload",
        payerAddress: "0x0000000000000000000000000000000000000002",
        agentKey: "default",
        payTo: "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1",
        token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        amount: "1000",
        network: "base",
        validAfter: 0,
        validBefore: 1_700_000_000,
      },
    });
    expect(createBuildBotFarcasterX402PaymentMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });
  });

  it("returns 401 on auth errors", async () => {
    allowRateLimit();
    requireBuildBotBearerAuthMock.mockRejectedValue(new BuildBotAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns 400 on malformed JSON", async () => {
    allowRateLimit();
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  it("ignores extra request fields", async () => {
    allowRateLimit();
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createBuildBotFarcasterX402PaymentMock.mockResolvedValue({
      xPayment: "base64-payload",
      payerAddress: "0x0000000000000000000000000000000000000002",
      payTo: "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      amount: "1000",
      network: "base",
      validAfter: 0,
      validBefore: 1_700_000_000,
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "not-a-uuid", unexpected: true }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(createBuildBotFarcasterX402PaymentMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });
  });

  it("returns 500 on signing errors", async () => {
    allowRateLimit();
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createBuildBotFarcasterX402PaymentMock.mockRejectedValue(
      new BuildBotFarcasterX402SigningError("failed to sign")
    );

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, error: "failed to sign" });
  });

  it("returns 403 on x402 policy errors", async () => {
    allowRateLimit();
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createBuildBotFarcasterX402PaymentMock.mockRejectedValue(
      new BuildBotPolicyError("x402 policy denied")
    );

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "x402 policy denied" });
  });

  it("returns 429 when rate limit denies request", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    enforceRateLimitMock.mockResolvedValue({
      allowed: false,
      status: 429,
      error: "Too many requests",
      retryAfterSeconds: 42,
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(await response.json()).toEqual({ ok: false, error: "Too many requests" });
    expect(createBuildBotFarcasterX402PaymentMock).not.toHaveBeenCalled();
  });
});
