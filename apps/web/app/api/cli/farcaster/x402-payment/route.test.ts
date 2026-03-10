import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireCliBearerAuthMock, createCliFarcasterX402PaymentMock, enforceRateLimitMock } =
  vi.hoisted(() => ({
    requireCliBearerAuthMock: vi.fn(),
    createCliFarcasterX402PaymentMock: vi.fn(),
    enforceRateLimitMock: vi.fn(),
  }));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliBearerAuth: (...args: unknown[]) => requireCliBearerAuthMock(...args),
}));

vi.mock("@/lib/server/cli/farcaster-x402", () => ({
  createCliFarcasterX402Payment: (...args: unknown[]) => createCliFarcasterX402PaymentMock(...args),
  CliFarcasterX402SigningError: class CliFarcasterX402SigningError extends Error {},
}));

vi.mock("@/lib/server/cli/farcaster-x402-rate-limit", () => ({
  enforceCliFarcasterX402RateLimit: (...args: unknown[]) => enforceRateLimitMock(...args),
}));

import { CliAuthError, CliPolicyError } from "@/lib/server/cli/errors";
import { CliFarcasterX402SigningError } from "@/lib/server/cli/farcaster-x402";
import { POST } from "./route";

describe("cli farcaster x402 payment route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const allowRateLimit = () => {
    enforceRateLimitMock.mockResolvedValue({ allowed: true });
  };

  it("returns x402 payment payload", async () => {
    allowRateLimit();
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createCliFarcasterX402PaymentMock.mockResolvedValue({
      xPayment: "base64-payload",
      payerAddress: "0x0000000000000000000000000000000000000002",
      agentKey: "default",
      payTo: "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      amount: "1000",
      network: "base",
      validAfter: 0,
      validBefore: 1_700_000_000,
    });

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
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
    expect(createCliFarcasterX402PaymentMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });
  });

  it("returns 401 on auth errors", async () => {
    allowRateLimit();
    requireCliBearerAuthMock.mockRejectedValue(new CliAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
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
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  it("rejects extra request fields", async () => {
    allowRateLimit();
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createCliFarcasterX402PaymentMock.mockResolvedValue({
      xPayment: "base64-payload",
      payerAddress: "0x0000000000000000000000000000000000000002",
      agentKey: "default",
      payTo: "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1",
      token: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      amount: "1000",
      network: "base",
      validAfter: 0,
      validBefore: 1_700_000_000,
    });

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idempotencyKey: "not-a-uuid", unexpected: true }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        ok: false,
        error: "Invalid request body",
      })
    );
    expect(createCliFarcasterX402PaymentMock).not.toHaveBeenCalled();
  });

  it("returns 500 on signing errors", async () => {
    allowRateLimit();
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createCliFarcasterX402PaymentMock.mockRejectedValue(
      new CliFarcasterX402SigningError("failed to sign")
    );

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
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
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "token-1",
      agentKey: "default",
    });
    createCliFarcasterX402PaymentMock.mockRejectedValue(new CliPolicyError("x402 policy denied"));

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ ok: false, error: "x402 policy denied" });
  });

  it("returns 429 when rate limit denies request", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
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

    const request = new Request("http://localhost/api/cli/farcaster/x402-payment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(await response.json()).toEqual({ ok: false, error: "Too many requests" });
    expect(createCliFarcasterX402PaymentMock).not.toHaveBeenCalled();
  });
});
