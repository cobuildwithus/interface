import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SubmitPermitResponse } from "./usdc-permit";
import { submitUsdcPermit } from "./usdc-permit";

const { submitUsdcPermitActionMock } = vi.hoisted(() => ({
  submitUsdcPermitActionMock: vi.fn(),
}));

vi.mock("@/app/(app)/actions/usdc-permit", () => ({
  submitUsdcPermitAction: (...args: Parameters<typeof submitUsdcPermitActionMock>) =>
    submitUsdcPermitActionMock(...args),
}));

const address = (char: string) => `0x${char.repeat(40)}` as `0x${string}`;
const sig = (char: string) => `0x${char.repeat(130)}` as `0x${string}`;

beforeEach(() => {
  submitUsdcPermitActionMock.mockReset();
});

describe("submitUsdcPermit", () => {
  it("posts permit data and returns success", async () => {
    const payload: SubmitPermitResponse = {
      success: true,
      txHash: `0x${"1".repeat(64)}` as `0x${string}`,
      explorerUrl: "https://basescan.org/tx/0x123",
    };

    submitUsdcPermitActionMock.mockResolvedValue(payload);

    const response = await submitUsdcPermit({
      chainId: 8453,
      token: address("a"),
      owner: address("b"),
      spender: address("c"),
      value: 1000n,
      deadline: 123n,
      signature: sig("d"),
    });

    expect(submitUsdcPermitActionMock).toHaveBeenCalledWith({
      chainId: 8453,
      token: address("a"),
      owner: address("b"),
      spender: address("c"),
      value: 1000n,
      deadline: 123n,
      signature: sig("d"),
    });
    expect(response).toEqual(payload);
  });

  it("returns error when action returns error payload", async () => {
    submitUsdcPermitActionMock.mockResolvedValue({ error: "Nope" });

    const response = await submitUsdcPermit({
      chainId: 8453,
      token: address("a"),
      owner: address("b"),
      spender: address("c"),
      value: 1n,
      deadline: 1n,
      signature: sig("d"),
    });

    expect(response).toEqual({ error: "Nope" });
  });

  it("returns fallback error when action payload is missing error/success", async () => {
    submitUsdcPermitActionMock.mockResolvedValue({ ok: false });

    const response = await submitUsdcPermit({
      chainId: 8453,
      token: address("a"),
      owner: address("b"),
      spender: address("c"),
      value: 1n,
      deadline: 1n,
      signature: sig("d"),
    });

    expect(response).toEqual({ error: "Permit submission failed" });
  });

  it("returns error when action throws", async () => {
    submitUsdcPermitActionMock.mockRejectedValue(new Error("Network down"));

    const response = await submitUsdcPermit({
      chainId: 8453,
      token: address("a"),
      owner: address("b"),
      spender: address("c"),
      value: 1n,
      deadline: 1n,
      signature: sig("d"),
    });

    expect(response).toEqual({ error: "Network down" });
  });

  it("returns unknown error when action throws non-error", async () => {
    submitUsdcPermitActionMock.mockRejectedValue("boom");

    const response = await submitUsdcPermit({
      chainId: 8453,
      token: address("a"),
      owner: address("b"),
      spender: address("c"),
      value: 1n,
      deadline: 1n,
      signature: sig("d"),
    });

    expect(response).toEqual({ error: "Unknown error" });
  });
});
