import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

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
import { POST } from "./route";

describe("cli farcaster signup write-scope audit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when auth requires write scope", async () => {
    requireCliBearerAuthMock.mockRejectedValue(new CliAuthError(403, "Write scope required"));

    const request = new Request("http://localhost/api/cli/farcaster/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signerPublicKey: "0x1111111111111111111111111111111111111111111111111111111111111111",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, error: "Write scope required" });
    expect(signupCliFarcasterMock).not.toHaveBeenCalled();
  });
});
