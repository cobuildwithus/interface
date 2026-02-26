import { afterEach, describe, expect, it, vi } from "vitest";
import { base, baseSepolia, mainnet, optimism, sepolia, type Chain } from "viem/chains";

import { explorerUrl, getAlchemyKey, getChain, getRpcUrl } from "./chains";

describe("chains helpers", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  describe("getAlchemyKey", () => {
    it("prefers server key in server runtime", () => {
      process.env.ALCHEMY_ID_SERVERSIDE = "server-key";
      process.env.NEXT_PUBLIC_ALCHEMY_ID = "public-key";

      expect(getAlchemyKey()).toBe("server-key");
    });

    it("uses public key in browser runtime", () => {
      vi.stubGlobal("window", {});
      process.env.ALCHEMY_ID_SERVERSIDE = "server-key";
      process.env.NEXT_PUBLIC_ALCHEMY_ID = "public-key";

      expect(getAlchemyKey()).toBe("public-key");
    });

    it("returns null when both env vars are missing", () => {
      delete process.env.ALCHEMY_ID_SERVERSIDE;
      delete process.env.NEXT_PUBLIC_ALCHEMY_ID;

      expect(getAlchemyKey()).toBeNull();
    });
  });

  describe("getChain", () => {
    it("maps supported chain ids", () => {
      expect(getChain(base.id)).toBe(base);
      expect(getChain(baseSepolia.id)).toBe(baseSepolia);
      expect(getChain(mainnet.id)).toBe(mainnet);
      expect(getChain(optimism.id)).toBe(optimism);
      expect(getChain(sepolia.id)).toBe(sepolia);
    });

    it("throws for unsupported chain ids", () => {
      expect(() => getChain(999999)).toThrow("Unsupported chainId: 999999");
    });
  });

  describe("getRpcUrl", () => {
    it("throws when no alchemy key is configured", () => {
      delete process.env.ALCHEMY_ID_SERVERSIDE;
      delete process.env.NEXT_PUBLIC_ALCHEMY_ID;

      expect(() => getRpcUrl(base, "http")).toThrow(
        "Missing Alchemy env var (ALCHEMY_ID_SERVERSIDE or NEXT_PUBLIC_ALCHEMY_ID)"
      );
    });

    it("builds correct http and ws urls for all supported chains", () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ID = "test-key";

      expect(getRpcUrl(base, "http")).toBe("https://base-mainnet.g.alchemy.com/v2/test-key");
      expect(getRpcUrl(base, "ws")).toBe("wss://base-mainnet.g.alchemy.com/v2/test-key");

      expect(getRpcUrl(baseSepolia, "http")).toBe("https://base-sepolia.g.alchemy.com/v2/test-key");
      expect(getRpcUrl(baseSepolia, "ws")).toBe("wss://base-sepolia.g.alchemy.com/v2/test-key");

      expect(getRpcUrl(mainnet, "http")).toBe("https://eth-mainnet.g.alchemy.com/v2/test-key");
      expect(getRpcUrl(mainnet, "ws")).toBe("wss://eth-mainnet.g.alchemy.com/v2/test-key");

      expect(getRpcUrl(optimism, "http")).toBe("https://opt-mainnet.g.alchemy.com/v2/test-key");
      expect(getRpcUrl(optimism, "ws")).toBe("wss://opt-mainnet.g.alchemy.com/v2/test-key");

      expect(getRpcUrl(sepolia, "http")).toBe("https://eth-sepolia.g.alchemy.com/v2/test-key");
      expect(getRpcUrl(sepolia, "ws")).toBe("wss://eth-sepolia.g.alchemy.com/v2/test-key");
    });

    it("throws for unsupported chain object", () => {
      process.env.NEXT_PUBLIC_ALCHEMY_ID = "test-key";
      const unsupportedChain = { id: 123456 } as Chain;

      expect(() => getRpcUrl(unsupportedChain, "http")).toThrow("Unsupported chain: 123456");
    });
  });

  describe("explorerUrl", () => {
    it("returns explorer links for supported chains", () => {
      expect(explorerUrl(mainnet.id, "0xabc", "tx")).toBe("https://etherscan.io/tx/0xabc");
      expect(explorerUrl(base.id, "0xabc", "address")).toBe("https://basescan.org/address/0xabc");
      expect(explorerUrl(sepolia.id, "0xabc", "tx")).toBe("https://sepolia.etherscan.io/tx/0xabc");
      expect(explorerUrl(baseSepolia.id, "0xabc", "address")).toBe(
        "https://sepolia.basescan.org/address/0xabc"
      );
    });

    it("returns empty string for unsupported chains", () => {
      expect(explorerUrl(987654, "0xabc", "tx")).toBe("");
    });
  });
});
