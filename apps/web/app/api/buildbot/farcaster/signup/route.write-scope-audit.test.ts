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
import { POST } from "./route";

describe("build-bot farcaster signup write-scope audit", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when auth requires write scope", async () => {
    requireBuildBotBearerAuthMock.mockRejectedValue(
      new BuildBotAuthError(403, "Write scope required")
    );

    const request = new Request("http://localhost/api/buildbot/farcaster/signup", {
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
    expect(signupBuildBotFarcasterMock).not.toHaveBeenCalled();
  });
});
