import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Address, Hex } from "viem";
import type { SubmitPermitResponse } from "@/lib/server/usdc-permit";

const { getSessionMock, submitUsdcPermitServerMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  submitUsdcPermitServerMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: (...args: Parameters<typeof getSessionMock>) => getSessionMock(...args),
}));

vi.mock("@/lib/server/usdc-permit", () => ({
  submitUsdcPermitServer: (...args: Parameters<typeof submitUsdcPermitServerMock>) =>
    submitUsdcPermitServerMock(...args),
}));

const OWNER = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Address;
const OWNER_UPPER = "0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD" as Address;
const MISMATCH_OWNER = "0x1234567890abcdef1234567890abcdef12345678" as Address;
const SPENDER = "0x1111111111111111111111111111111111111111" as Address;
const SIGNATURE = `0x${"1".repeat(130)}` as Hex;

const loadModule = async () => import("./usdc-permit");

describe("submitUsdcPermitAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns Unauthorized when session address is missing", async () => {
    getSessionMock.mockResolvedValue({});

    const { submitUsdcPermitAction } = await loadModule();
    const result = await submitUsdcPermitAction({
      owner: OWNER,
      spender: SPENDER,
      value: "1",
      deadline: "2",
      signature: SIGNATURE,
    });

    expect(result).toEqual({ error: "Unauthorized" });
    expect(submitUsdcPermitServerMock).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when session address is malformed", async () => {
    getSessionMock.mockResolvedValue({ address: "not-an-address" });

    const { submitUsdcPermitAction } = await loadModule();
    const result = await submitUsdcPermitAction({
      owner: OWNER,
      spender: SPENDER,
      value: "1",
      deadline: "2",
      signature: SIGNATURE,
    });

    expect(result).toEqual({ error: "Unauthorized" });
    expect(submitUsdcPermitServerMock).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when owner does not match session address", async () => {
    getSessionMock.mockResolvedValue({ address: OWNER });

    const { submitUsdcPermitAction } = await loadModule();
    const result = await submitUsdcPermitAction({
      owner: MISMATCH_OWNER,
      spender: SPENDER,
      value: "1",
      deadline: "2",
      signature: SIGNATURE,
    });

    expect(result).toEqual({ error: "Unauthorized" });
    expect(submitUsdcPermitServerMock).not.toHaveBeenCalled();
  });

  it("returns Unauthorized when owner is malformed", async () => {
    getSessionMock.mockResolvedValue({ address: OWNER });

    const { submitUsdcPermitAction } = await loadModule();
    const result = await submitUsdcPermitAction({
      owner: "not-an-address" as Address,
      spender: SPENDER,
      value: "1",
      deadline: "2",
      signature: SIGNATURE,
    });

    expect(result).toEqual({ error: "Unauthorized" });
    expect(submitUsdcPermitServerMock).not.toHaveBeenCalled();
  });

  it("submits permit when session owner matches after normalization", async () => {
    getSessionMock.mockResolvedValue({ address: OWNER_UPPER });
    const response: SubmitPermitResponse = {
      success: true,
      txHash: `0x${"a".repeat(64)}` as Hex,
      explorerUrl: "https://basescan.org/tx/0x" + "a".repeat(64),
    };
    submitUsdcPermitServerMock.mockResolvedValue(response);

    const { submitUsdcPermitAction } = await loadModule();
    const result = await submitUsdcPermitAction({
      chainId: 8453,
      token: OWNER,
      owner: OWNER,
      spender: SPENDER,
      value: 42n,
      deadline: 99n,
      signature: SIGNATURE,
    });

    expect(result).toEqual(response);
    expect(submitUsdcPermitServerMock).toHaveBeenCalledWith({
      chainId: 8453,
      token: OWNER,
      owner: OWNER,
      spender: SPENDER,
      value: "42",
      deadline: "99",
      signature: SIGNATURE,
    });
  });
});
