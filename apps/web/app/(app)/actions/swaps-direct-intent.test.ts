import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, registerDirectIntentMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  registerDirectIntentMock: vi.fn(),
}));

vi.mock("@/lib/domains/auth/session", () => ({
  getSession: (...args: Parameters<typeof getSessionMock>) => getSessionMock(...args),
}));

vi.mock("@/lib/server/swaps-direct-intent", () => ({
  registerDirectIntent: (...args: Parameters<typeof registerDirectIntentMock>) =>
    registerDirectIntentMock(...args),
}));

import { registerDirectIntentAction } from "./swaps-direct-intent";

const validBody = {
  txHash: `0x${"a".repeat(64)}`,
  tokenAddress: `0x${"b".repeat(40)}`,
  entityId: `0x${"c".repeat(40)}`,
};

describe("registerDirectIntentAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects unauthenticated callers", async () => {
    getSessionMock.mockResolvedValue({});

    const result = await registerDirectIntentAction(validBody);

    expect(result).toEqual({ ok: false, error: "Unauthorized" });
    expect(registerDirectIntentMock).not.toHaveBeenCalled();
  });

  it("rejects callers with an empty session address", async () => {
    getSessionMock.mockResolvedValue({ address: "" });

    const result = await registerDirectIntentAction(validBody);

    expect(result).toEqual({ ok: false, error: "Unauthorized" });
    expect(registerDirectIntentMock).not.toHaveBeenCalled();
  });

  it("returns ok when downstream registration succeeds", async () => {
    getSessionMock.mockResolvedValue({ address: `0x${"d".repeat(40)}` });
    registerDirectIntentMock.mockResolvedValue({ ok: true, data: { ok: true } });

    const result = await registerDirectIntentAction(validBody);

    expect(result).toEqual({ ok: true });
    expect(registerDirectIntentMock).toHaveBeenCalledTimes(1);
    expect(registerDirectIntentMock).toHaveBeenCalledWith(validBody);
  });

  it("propagates downstream error messages", async () => {
    getSessionMock.mockResolvedValue({ address: `0x${"d".repeat(40)}` });
    registerDirectIntentMock.mockResolvedValue({
      ok: false,
      status: 500,
      error: "Rules service unavailable",
    });

    const result = await registerDirectIntentAction(validBody);

    expect(result).toEqual({ ok: false, error: "Rules service unavailable" });
  });
});
