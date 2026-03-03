import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getCliExplorerTxUrl } from "@/lib/server/cli/explorer";

describe("cli explorer", () => {
  it("returns null when transaction hash is missing", () => {
    expect(getCliExplorerTxUrl("base", null)).toBeNull();
    expect(getCliExplorerTxUrl("base", undefined)).toBeNull();
    expect(getCliExplorerTxUrl("base", "")).toBeNull();
  });

  it("returns null when network is unsupported", () => {
    expect(getCliExplorerTxUrl("unknown-network", "0xabc")).toBeNull();
  });

  it("returns expected tx URLs for supported network aliases", () => {
    expect(getCliExplorerTxUrl("base", "0xbase")).toBe("https://basescan.org/tx/0xbase");
    expect(getCliExplorerTxUrl("BASE-MAINNET", "0xmainnet")).toBe(
      "https://basescan.org/tx/0xmainnet"
    );
    expect(getCliExplorerTxUrl("base-sepolia", "0xsep")).toBe(
      "https://sepolia.basescan.org/tx/0xsep"
    );
    expect(getCliExplorerTxUrl("ethereum", "0xeth")).toBe("https://etherscan.io/tx/0xeth");
    expect(getCliExplorerTxUrl("ethereum-sepolia", "0xethsep")).toBe(
      "https://sepolia.etherscan.io/tx/0xethsep"
    );
    expect(getCliExplorerTxUrl("SEPOLIA", "0xsepolia")).toBe(
      "https://sepolia.etherscan.io/tx/0xsepolia"
    );
    expect(getCliExplorerTxUrl("optimism", "0xop")).toBe("https://optimistic.etherscan.io/tx/0xop");
    expect(getCliExplorerTxUrl("OPTIMISM-SEPOLIA", "0xopsepolia")).toBe(
      "https://sepolia-optimism.etherscan.io/tx/0xopsepolia"
    );
  });
});
