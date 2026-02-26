import { describe, expect, it, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("wagmi config", () => {
  it("uses alchemy rpc when key available", async () => {
    const createConfig = vi.fn((opts) => opts);
    const createStorage = vi.fn((opts) => opts);
    const http = vi.fn((arg?: string) => ({ arg }));

    vi.doMock("@privy-io/wagmi", () => ({ createConfig }));
    vi.doMock("wagmi", () => ({ cookieStorage: {}, createStorage, http }));
    vi.doMock("@/lib/domains/token/onchain/chains", () => ({
      getAlchemyKey: () => "key",
      getRpcUrl: () => "http://rpc",
    }));

    const mod = await import("@/lib/domains/token/onchain/wagmi-config");
    expect(mod.chains.length).toBeGreaterThan(0);
    expect(createConfig).toHaveBeenCalled();
    expect(http).toHaveBeenCalledWith("http://rpc");
  });

  it("falls back to default http when no key", async () => {
    const createConfig = vi.fn((opts) => opts);
    const createStorage = vi.fn((opts) => opts);
    const http = vi.fn((arg?: string) => ({ arg }));

    vi.doMock("@privy-io/wagmi", () => ({ createConfig }));
    vi.doMock("wagmi", () => ({ cookieStorage: {}, createStorage, http }));
    vi.doMock("@/lib/domains/token/onchain/chains", () => ({
      getAlchemyKey: () => null,
      getRpcUrl: () => "http://rpc",
    }));

    await import("@/lib/domains/token/onchain/wagmi-config");
    expect(http).toHaveBeenCalledWith();
  });
});
