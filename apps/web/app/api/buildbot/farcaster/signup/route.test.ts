import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { requireBuildBotBearerAuthMock, signupBuildBotFarcasterMock } = vi.hoisted(() => ({
  requireBuildBotBearerAuthMock: vi.fn(),
  signupBuildBotFarcasterMock: vi.fn(),
}));

vi.mock("@/lib/server/build-bot/auth", () => ({
  requireBuildBotBearerAuth: (...args: unknown[]) => requireBuildBotBearerAuthMock(...args),
}));

vi.mock("@/lib/server/build-bot/farcaster-signup", () => ({
  signupBuildBotFarcaster: (...args: unknown[]) => signupBuildBotFarcasterMock(...args),
  BuildBotFarcasterAlreadyRegisteredError: class BuildBotFarcasterAlreadyRegisteredError extends Error {
    readonly fid: string;
    readonly custodyAddress: `0x${string}`;

    constructor(params: { fid: bigint; custodyAddress: `0x${string}` }) {
      super(
        `Farcaster account already exists for this agent wallet (fid: ${params.fid.toString()}).`
      );
      this.fid = params.fid.toString();
      this.custodyAddress = params.custodyAddress;
    }
  },
  BuildBotFarcasterUserOperationError: class BuildBotFarcasterUserOperationError extends Error {},
}));

import { BuildBotAuthError } from "@/lib/server/build-bot/errors";
import {
  BuildBotFarcasterAlreadyRegisteredError,
  BuildBotFarcasterUserOperationError,
} from "@/lib/server/build-bot/farcaster-signup";
import { POST } from "./route";

describe("build-bot farcaster signup route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns signup result", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupBuildBotFarcasterMock.mockResolvedValue({
      status: "complete",
      network: "optimism",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      custodyAddress: "0x0000000000000000000000000000000000000002",
      recoveryAddress: "0x0000000000000000000000000000000000000001",
      fid: "123",
      idGatewayPriceWei: "7000000000000000",
      txHash: "0xsignup",
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      ok: true,
      result: {
        status: "complete",
        network: "optimism",
        ownerAddress: "0x0000000000000000000000000000000000000001",
        custodyAddress: "0x0000000000000000000000000000000000000002",
        recoveryAddress: "0x0000000000000000000000000000000000000001",
        fid: "123",
        idGatewayPriceWei: "7000000000000000",
        txHash: "0xsignup",
      },
    });
    expect(requireBuildBotBearerAuthMock).toHaveBeenCalledWith(request, { requireWrite: true });
    expect(signupBuildBotFarcasterMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      recoveryAddress: undefined,
      extraStorage: 0n,
    });
  });

  it("returns 401 on auth errors", async () => {
    requireBuildBotBearerAuthMock.mockRejectedValue(new BuildBotAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("returns 400 on malformed JSON", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  it("returns 400 when signerPublicKey is invalid", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1234",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(signupBuildBotFarcasterMock).not.toHaveBeenCalled();
  });

  it("returns 400 when extraStorage exceeds the allowed cap", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
        extraStorage: 11,
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok?: boolean; error?: string; details?: unknown };
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("Invalid request body");
    expect(signupBuildBotFarcasterMock).not.toHaveBeenCalled();
  });

  it("returns 409 when wallet already has a Farcaster account", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupBuildBotFarcasterMock.mockRejectedValue(
      new BuildBotFarcasterAlreadyRegisteredError({
        fid: 77n,
        custodyAddress: "0x0000000000000000000000000000000000000002",
      })
    );

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Farcaster account already exists for this agent wallet (fid: 77).",
      details: {
        fid: "77",
        custodyAddress: "0x0000000000000000000000000000000000000002",
      },
    });
  });

  it("returns 500 on user operation failure", async () => {
    requireBuildBotBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupBuildBotFarcasterMock.mockRejectedValue(
      new BuildBotFarcasterUserOperationError(
        "Farcaster signup user operation failed before confirmation"
      )
    );

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      ok: false,
      error: "Farcaster signup user operation failed before confirmation",
    });
  });
});
