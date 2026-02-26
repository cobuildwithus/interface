import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { unstable_cache as unstableCache } from "next/cache";

import {
  getAlchemyKey,
  getChain,
  getRpcUrl,
  explorerUrl,
} from "@/lib/domains/token/onchain/chains";

import { DEFAULT_ETH_PRICE_USDC } from "@/lib/domains/token/onchain/addresses";

vi.mock("server-only", () => ({}));
const passthroughCache: typeof unstableCache = (fn, _keyParts, _options) => fn;

// Ensure the ABI module is loaded for coverage
import "@/lib/domains/token/onchain/abis";

describe("onchain chains helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("prefers server-side alchemy key", () => {
    process.env.ALCHEMY_ID_SERVERSIDE = "server-key";
    process.env.NEXT_PUBLIC_ALCHEMY_ID = "public-key";
    expect(getAlchemyKey()).toBe("server-key");
  });

  it("falls back to public alchemy key", () => {
    delete process.env.ALCHEMY_ID_SERVERSIDE;
    process.env.NEXT_PUBLIC_ALCHEMY_ID = "public-key";
    expect(getAlchemyKey()).toBe("public-key");
  });

  it("throws for missing alchemy key in getRpcUrl", () => {
    delete process.env.ALCHEMY_ID_SERVERSIDE;
    delete process.env.NEXT_PUBLIC_ALCHEMY_ID;
    expect(() => getRpcUrl(getChain(8453), "http")).toThrow("Missing Alchemy env var");
  });

  it("builds RPC URLs and explorer URLs", () => {
    process.env.NEXT_PUBLIC_ALCHEMY_ID = "k";
    const base = getChain(8453);
    expect(getRpcUrl(base, "ws")).toContain("wss://base-mainnet.g.alchemy.com/v2/k");
    expect(explorerUrl(1, "0xabc", "tx")).toBe("https://etherscan.io/tx/0xabc");
    expect(explorerUrl(999, "0xabc", "address")).toBe("");
  });

  it("covers additional chain branches", () => {
    process.env.NEXT_PUBLIC_ALCHEMY_ID = "k";
    const sepolia = getChain(11155111);
    const baseSepolia = getChain(84532);
    const optimism = getChain(10);
    expect(getRpcUrl(sepolia, "http")).toContain("eth-sepolia");
    expect(getRpcUrl(baseSepolia, "http")).toContain("base-sepolia");
    expect(getRpcUrl(optimism, "http")).toContain("opt-mainnet");
    expect(explorerUrl(8453, "0xabc", "address")).toContain("basescan");
    expect(() => getChain(999)).toThrow("Unsupported chainId");
  });
});

describe("onchain clients", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates and caches clients, with and without alchemy key", async () => {
    const createPublicClient = vi.fn((opts) => ({ opts }));
    const http = vi.fn((...args) => ({ args }));

    vi.doMock("viem", async (importOriginal) => {
      const actual = await importOriginal<typeof import("viem")>();
      return { ...actual, createPublicClient, http };
    });
    vi.doMock("viem/chains", () => ({
      base: { id: 8453 },
      mainnet: { id: 1 },
      optimism: { id: 10 },
    }));
    const getAlchemyKey = vi.fn().mockReturnValueOnce("key").mockReturnValueOnce(null);
    const getRpcUrl = vi.fn(() => "http://rpc");
    vi.doMock("@/lib/domains/token/onchain/chains", () => ({ getAlchemyKey, getRpcUrl }));

    const { getClient } = await import("@/lib/domains/token/onchain/clients");

    const baseClient = getClient(8453);
    const baseClientAgain = getClient(8453);
    const optimismClient = getClient(10);
    const mainnetClient = getClient(1);

    expect(baseClient).toBe(baseClientAgain);
    expect(mainnetClient).not.toBe(baseClient);
    expect(mainnetClient).not.toBe(optimismClient);
    expect(createPublicClient).toHaveBeenCalledTimes(3);
    expect(http).toHaveBeenCalled();
    expect(getRpcUrl).toHaveBeenCalled();
  });
});

describe("onchain eth price", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns fallback when price missing or error", async () => {
    const prisma = {
      tokenMetadata: {
        findUnique: vi.fn().mockResolvedValueOnce({ priceUsdc: null }).mockRejectedValueOnce({}),
      },
    };
    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));

    const { getEthPriceUsdc } = await import("@/lib/domains/token/onchain/eth-price");

    await expect(getEthPriceUsdc()).resolves.toBe(DEFAULT_ETH_PRICE_USDC);
    await expect(getEthPriceUsdc()).resolves.toBe(DEFAULT_ETH_PRICE_USDC);
  });

  it("returns stored price when present", async () => {
    const prisma = {
      tokenMetadata: {
        findUnique: vi.fn().mockResolvedValue({ priceUsdc: "123.45" }),
      },
    };
    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));

    const { getEthPriceUsdc } = await import("@/lib/domains/token/onchain/eth-price");

    await expect(getEthPriceUsdc()).resolves.toBe(123.45);
  });
});

describe("onchain project stats", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("computes treasury with Decimal balance", async () => {
    class Decimal {
      val: number;
      constructor(val: number) {
        this.val = val;
      }
      toNumber() {
        return this.val;
      }
    }

    const prisma = {
      juiceboxProject: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ balance: new Decimal(2e18), contributorsCount: 10 }),
      },
      tokenMetadata: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({ priceUsdc: "2.5" })
          .mockResolvedValueOnce({ priceUsdc: "2000" }),
      },
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/generated/prisma/client", () => ({ Prisma: { Decimal } }));

    const { getProjectStats } = await import("@/lib/domains/token/onchain/project-stats");
    const result = await getProjectStats();

    expect(result).toEqual({ priceUsdc: 2.5, treasuryUsdc: 4000, holdersCount: 10 });
  });

  it("handles null price data", async () => {
    const prisma = {
      juiceboxProject: {
        findUnique: vi.fn().mockResolvedValue({ balance: 0, contributorsCount: null }),
      },
      tokenMetadata: {
        findUnique: vi.fn().mockResolvedValue({ priceUsdc: null }),
      },
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/server/db/cobuild-db-client", () => ({ default: prisma }));
    vi.doMock("@/generated/prisma/client", () => ({ Prisma: { Decimal: class Decimal {} } }));

    const { getProjectStats } = await import("@/lib/domains/token/onchain/project-stats");
    const result = await getProjectStats();

    expect(result.priceUsdc).toBeNull();
    expect(result.treasuryUsdc).toBeNull();
    expect(result.holdersCount).toBe(0);
  });
});

describe("onchain revnet data", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reads ruleset + terminal address", async () => {
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([{ weight: 123n }, { reservedPercent: 42, pausePay: false }])
        .mockResolvedValueOnce("0x" + "1".repeat(40))
        .mockResolvedValueOnce(["0x" + "2".repeat(40)]),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({ getClient: () => client }));

    const { getRevnetData } = await import("@/lib/domains/token/onchain/revnet-data");

    const data = await getRevnetData();
    expect(data).toEqual({
      weight: "123",
      reservedPercent: 42,
      isPaused: false,
      terminalAddress: "0x" + "1".repeat(40),
      supportsEthPayments: true,
    });
  });

  it("falls back to terminals list when primary terminal is unset", async () => {
    const { jbContracts, NATIVE_TOKEN } = await import("@/lib/domains/token/onchain/revnet");
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([{ weight: 777n }, { reservedPercent: 12, pausePay: true }])
        .mockResolvedValueOnce("0x" + "0".repeat(40))
        .mockResolvedValueOnce(["0x" + "3".repeat(40), jbContracts.multiTerminal])
        .mockResolvedValueOnce([{ token: NATIVE_TOKEN }]),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({ getClient: () => client }));

    const { getRevnetData } = await import("@/lib/domains/token/onchain/revnet-data");

    const data = await getRevnetData();
    expect(data).toEqual({
      weight: "777",
      reservedPercent: 12,
      isPaused: true,
      terminalAddress: jbContracts.multiTerminal,
      supportsEthPayments: true,
    });
  });

  it("marks eth unsupported when multi terminal lacks native token", async () => {
    const { jbContracts } = await import("@/lib/domains/token/onchain/revnet");
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([{ weight: 88n }, { reservedPercent: 7, pausePay: false }])
        .mockResolvedValueOnce("0x" + "0".repeat(40))
        .mockResolvedValueOnce([jbContracts.multiTerminal])
        .mockResolvedValueOnce([{ token: "0x" + "9".repeat(40) }]),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({ getClient: () => client }));

    const { getRevnetData } = await import("@/lib/domains/token/onchain/revnet-data");

    const data = await getRevnetData();
    expect(data.terminalAddress).toBe(jbContracts.multiTerminal);
    expect(data.supportsEthPayments).toBe(false);
  });

  it("falls back to first terminal when multi terminal is not registered", async () => {
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([{ weight: 5n }, { reservedPercent: 1, pausePay: false }])
        .mockResolvedValueOnce("0x" + "0".repeat(40))
        .mockResolvedValueOnce(["0x" + "4".repeat(40)]),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({ getClient: () => client }));

    const { getRevnetData } = await import("@/lib/domains/token/onchain/revnet-data");

    const data = await getRevnetData();
    expect(data.terminalAddress).toBe("0x" + "4".repeat(40));
    expect(data.supportsEthPayments).toBe(true);
  });

  it("returns zero address when no terminals are configured", async () => {
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([{ weight: 9n }, { reservedPercent: 0, pausePay: false }])
        .mockResolvedValueOnce("0x" + "0".repeat(40))
        .mockResolvedValueOnce(undefined),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({ getClient: () => client }));

    const { getRevnetData } = await import("@/lib/domains/token/onchain/revnet-data");

    const data = await getRevnetData();
    expect(data.terminalAddress).toBe("0x" + "0".repeat(40));
    expect(data.supportsEthPayments).toBe(false);
  });

  it("uses the swap project id when fetching swap revnet data", async () => {
    const { COBUILD_SWAP_PROJECT_ID } = await import("@/lib/domains/token/onchain/revnet");
    const client = {
      readContract: vi
        .fn()
        .mockResolvedValueOnce([{ weight: 10n }, { reservedPercent: 3, pausePay: false }])
        .mockResolvedValueOnce("0x" + "1".repeat(40))
        .mockResolvedValueOnce(["0x" + "1".repeat(40)]),
    };

    vi.doMock("next/cache", () => ({ unstable_cache: passthroughCache }));
    vi.doMock("@/lib/domains/token/onchain/clients", () => ({ getClient: () => client }));

    const { getSwapRevnetData } = await import("@/lib/domains/token/onchain/revnet-data");

    await getSwapRevnetData();
    expect(client.readContract.mock.calls[0]?.[0]?.args?.[0]).toBe(COBUILD_SWAP_PROJECT_ID);
  });
});
