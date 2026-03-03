import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { randomBytesMock, getCliCdpClientMock, getOrCreateCliAgentOwnerAccountMock } = vi.hoisted(
  () => ({
    randomBytesMock: vi.fn(),
    getCliCdpClientMock: vi.fn(),
    getOrCreateCliAgentOwnerAccountMock: vi.fn(),
  })
);

vi.mock("crypto", () => ({
  randomBytes: (...args: unknown[]) => randomBytesMock(...args),
}));

vi.mock("./cdp-client", () => ({
  getCliCdpClient: (...args: unknown[]) => getCliCdpClientMock(...args),
}));

vi.mock("./wallet-store", () => ({
  getOrCreateCliAgentOwnerAccount: (...args: unknown[]) =>
    getOrCreateCliAgentOwnerAccountMock(...args),
}));

import { CliPolicyError } from "./errors";
import { CliFarcasterX402SigningError, createCliFarcasterX402Payment } from "./farcaster-x402";

const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const NEYNAR_PAY_TO = "0xa6a8736f18f383f1cc2d938576933e5ea7df01a1";

function clearPolicyEnv() {
  delete process.env.CLI_FARCASTER_X402_ALLOWED_TOKEN;
  delete process.env.BROKER_FARCASTER_X402_ALLOWED_TOKEN;
  delete process.env.CLI_FARCASTER_X402_ALLOWED_PAY_TO;
  delete process.env.BROKER_FARCASTER_X402_ALLOWED_PAY_TO;
  delete process.env.CLI_FARCASTER_X402_MAX_AMOUNT_MICRO_USDC;
  delete process.env.BROKER_FARCASTER_X402_MAX_AMOUNT_MICRO_USDC;
  delete process.env.CLI_FARCASTER_X402_REQUIRE_ACCOUNT_POLICY;
  delete process.env.BROKER_FARCASTER_X402_REQUIRE_ACCOUNT_POLICY;
  delete process.env.CLI_ACCOUNT_POLICY_ID;
  delete process.env.BROKER_ACCOUNT_POLICY_ID;
}

describe("createCliFarcasterX402Payment", () => {
  const signTypedDataMock = vi.fn();
  let dateNowSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearPolicyEnv();

    randomBytesMock.mockReturnValue(Buffer.alloc(32, 7));
    getOrCreateCliAgentOwnerAccountMock.mockResolvedValue({
      address: "0x00000000000000000000000000000000000000aa",
    });
    signTypedDataMock.mockResolvedValue({
      signature:
        "0x111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111b",
    });
    getCliCdpClientMock.mockReturnValue({
      evm: {
        signTypedData: (...args: unknown[]) => signTypedDataMock(...args),
      },
    });
    dateNowSpy = vi.spyOn(Date, "now");
    dateNowSpy.mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    clearPolicyEnv();
    dateNowSpy.mockRestore();
  });

  it("uses fixed USDC + Neynar targets even when token/pay-to env overrides are set", async () => {
    process.env.CLI_FARCASTER_X402_ALLOWED_TOKEN = "0x00000000000000000000000000000000000000bb";
    process.env.CLI_FARCASTER_X402_ALLOWED_PAY_TO = "0x00000000000000000000000000000000000000cc";

    const result = await createCliFarcasterX402Payment({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });

    expect(signTypedDataMock).toHaveBeenCalledOnce();
    expect(signTypedDataMock).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: expect.objectContaining({
          verifyingContract: USDC_BASE,
        }),
        message: expect.objectContaining({
          to: NEYNAR_PAY_TO,
          value: "1000",
          validBefore: "1700000300",
        }),
      })
    );

    expect(result.token).toBe(USDC_BASE);
    expect(result.payTo).toBe(NEYNAR_PAY_TO);
    expect(result.validBefore).toBe(1_700_000_300);

    const decoded = JSON.parse(Buffer.from(result.xPayment, "base64").toString("utf8")) as {
      payload: { authorization: { to: string; value: string; validBefore: string } };
    };
    expect(decoded.payload.authorization.to).toBe(NEYNAR_PAY_TO);
    expect(decoded.payload.authorization.value).toBe("1000");
    expect(decoded.payload.authorization.validBefore).toBe("1700000300");
  });

  it("rejects when configured max amount cap is below the fixed transfer amount", async () => {
    process.env.CLI_FARCASTER_X402_MAX_AMOUNT_MICRO_USDC = "999";

    await expect(
      createCliFarcasterX402Payment({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "x402 signing policy violation: amount exceeds configured cap",
      })
    );

    expect(getOrCreateCliAgentOwnerAccountMock).not.toHaveBeenCalled();
    expect(signTypedDataMock).not.toHaveBeenCalled();
  });

  it("enforces account policy when the policy knob is enabled", async () => {
    process.env.CLI_FARCASTER_X402_REQUIRE_ACCOUNT_POLICY = "true";

    await expect(
      createCliFarcasterX402Payment({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "x402 signing requires CLI_ACCOUNT_POLICY_ID (or BROKER_ACCOUNT_POLICY_ID)",
      })
    );
  });

  it("allows signing when account policy is required and configured", async () => {
    process.env.CLI_FARCASTER_X402_REQUIRE_ACCOUNT_POLICY = "true";
    process.env.CLI_ACCOUNT_POLICY_ID = "policy-123";

    const result = await createCliFarcasterX402Payment({
      ownerAddress: "0x0000000000000000000000000000000000000001",
      agentKey: "default",
    });

    expect(result.xPayment.length).toBeGreaterThan(0);
    expect(signTypedDataMock).toHaveBeenCalledOnce();
  });

  it("requires account policy by default in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(
      createCliFarcasterX402Payment({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message: "x402 signing requires CLI_ACCOUNT_POLICY_ID (or BROKER_ACCOUNT_POLICY_ID)",
      })
    );
  });

  it("wraps signing failures with CliFarcasterX402SigningError", async () => {
    signTypedDataMock.mockRejectedValueOnce(new Error("cdp unavailable"));

    await expect(
      createCliFarcasterX402Payment({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).rejects.toBeInstanceOf(CliFarcasterX402SigningError);
  });

  it("throws CliPolicyError for invalid max amount knob values", async () => {
    process.env.CLI_FARCASTER_X402_MAX_AMOUNT_MICRO_USDC = "0";

    await expect(
      createCliFarcasterX402Payment({
        ownerAddress: "0x0000000000000000000000000000000000000001",
        agentKey: "default",
      })
    ).rejects.toBeInstanceOf(CliPolicyError);
  });
});
