import {
  buildFarcasterSignupAlreadyRegisteredErrorResponse,
  buildFarcasterSignupCompletedResult,
  buildFarcasterSignupResponse,
} from "@cobuild/wire";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@cobuild/wire", async () => {
  return await vi.importActual<typeof import("@cobuild/wire")>("@cobuild/wire");
});

const { requireCliBearerAuthMock, signupCliFarcasterMock } = vi.hoisted(() => ({
  requireCliBearerAuthMock: vi.fn(),
  signupCliFarcasterMock: vi.fn(),
}));

vi.mock("@/lib/server/cli/auth", () => ({
  requireCliBearerAuth: (...args: unknown[]) => requireCliBearerAuthMock(...args),
}));

vi.mock("@/lib/server/cli/farcaster-signup", () => ({
  signupCliFarcaster: (...args: unknown[]) => signupCliFarcasterMock(...args),
  CliFarcasterAlreadyRegisteredError: class CliFarcasterAlreadyRegisteredError extends Error {
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
  CliFarcasterUserOperationError: class CliFarcasterUserOperationError extends Error {},
}));

import { CliAuthError } from "@/lib/server/cli/errors";
import {
  CliFarcasterAlreadyRegisteredError,
  CliFarcasterUserOperationError,
} from "@/lib/server/cli/farcaster-signup";
import { POST } from "./route";

const TX_HASH = `0x${"aa".repeat(32)}`;

describe("cli farcaster signup route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns signup result", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupCliFarcasterMock.mockResolvedValue({
      status: "complete",
      network: "optimism",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      custodyAddress: "0x0000000000000000000000000000000000000002",
      recoveryAddress: "0x0000000000000000000000000000000000000001",
      fid: "123",
      idGatewayPriceWei: "7000000000000000",
      txHash: TX_HASH,
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual(
      buildFarcasterSignupResponse(
        buildFarcasterSignupCompletedResult({
          ownerAddress: "0x0000000000000000000000000000000000000001",
          custodyAddress: "0x0000000000000000000000000000000000000002",
          recoveryAddress: "0x0000000000000000000000000000000000000001",
          fid: 123n,
          idGatewayPriceWei: 7_000_000_000_000_000n,
          txHash: TX_HASH,
        })
      )
    );
    expect(requireCliBearerAuthMock).toHaveBeenCalledWith(request, {
      requiredScopes: ["wallet:execute"],
    });
    expect(signupCliFarcasterMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      recoveryAddress: undefined,
      extraStorage: 0n,
    });
  });

  it("passes non-zero extraStorage through shared normalization to the hosted signup service", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupCliFarcasterMock.mockResolvedValue({
      status: "needs_funding",
      network: "optimism",
      ownerAddress: "0x0000000000000000000000000000000000000001",
      custodyAddress: "0x0000000000000000000000000000000000000002",
      recoveryAddress: "0x0000000000000000000000000000000000000009",
      idGatewayPriceWei: "7000000000000000",
      idGatewayPriceEth: "0.007",
      balanceWei: "0",
      balanceEth: "0",
      requiredWei: "7200000000000000",
      requiredEth: "0.0072",
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
        recoveryAddress: "0x0000000000000000000000000000000000000009",
        extraStorage: 2,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(signupCliFarcasterMock).toHaveBeenCalledWith({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
      signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      recoveryAddress: "0x0000000000000000000000000000000000000009",
      extraStorage: 2n,
    });
  });

  it("returns 401 on auth errors", async () => {
    requireCliBearerAuthMock.mockRejectedValue(new CliAuthError(401, "Unauthorized"));

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
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
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: "Invalid JSON body" });
  });

  it("returns 400 when signerPublicKey is invalid", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1234",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(signupCliFarcasterMock).not.toHaveBeenCalled();
  });

  it("returns 400 when extraStorage exceeds the allowed cap", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
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
    expect(payload.error).toBe("extraStorage max is 10");
    expect(signupCliFarcasterMock).not.toHaveBeenCalled();
  });

  it("returns 400 when numeric extraStorage is negative", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
        extraStorage: -1,
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("extraStorage must be a non-negative integer");
    expect(signupCliFarcasterMock).not.toHaveBeenCalled();
  });

  it("returns 400 when numeric extraStorage is fractional", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
        extraStorage: 1.5,
      }),
    });

    const response = await POST(request);
    const payload = (await response.json()) as { ok?: boolean; error?: string };
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error).toBe("extraStorage must be a non-negative integer");
    expect(signupCliFarcasterMock).not.toHaveBeenCalled();
  });

  it("returns 409 when wallet already has a Farcaster account", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupCliFarcasterMock.mockRejectedValue(
      new CliFarcasterAlreadyRegisteredError({
        fid: 77n,
        custodyAddress: "0x0000000000000000000000000000000000000002",
      })
    );

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      buildFarcasterSignupAlreadyRegisteredErrorResponse({
        error: "Farcaster account already exists for this agent wallet (fid: 77).",
        fid: 77n,
        custodyAddress: "0x0000000000000000000000000000000000000002",
      })
    );
  });

  it("returns 500 on user operation failure", async () => {
    requireCliBearerAuthMock.mockResolvedValue({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      tokenId: "1",
      agentKey: "default",
    });
    signupCliFarcasterMock.mockRejectedValue(
      new CliFarcasterUserOperationError(
        "Farcaster signup user operation failed before confirmation"
      )
    );

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
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
