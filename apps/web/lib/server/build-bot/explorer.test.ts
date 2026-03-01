import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getBuildBotExplorerTxUrl } from "@/lib/server/build-bot/explorer";

describe("build-bot explorer", () => {
  it("returns null when transaction hash is missing", () => {
    expect(getBuildBotExplorerTxUrl("base", null)).toBeNull();
    expect(getBuildBotExplorerTxUrl("base", undefined)).toBeNull();
    expect(getBuildBotExplorerTxUrl("base", "")).toBeNull();
  });

  it("returns null when network is unsupported", () => {
    expect(getBuildBotExplorerTxUrl("unknown-network", "0xabc")).toBeNull();
  });

  it("returns expected tx URLs for supported network aliases", () => {
    expect(getBuildBotExplorerTxUrl("base", "0xbase")).toBe("https://basescan.org/tx/0xbase");
    expect(getBuildBotExplorerTxUrl("BASE-MAINNET", "0xmainnet")).toBe(
      "https://basescan.org/tx/0xmainnet"
    );
    expect(getBuildBotExplorerTxUrl("base-sepolia", "0xsep")).toBe(
      "https://sepolia.basescan.org/tx/0xsep"
    );
    expect(getBuildBotExplorerTxUrl("ethereum", "0xeth")).toBe("https://etherscan.io/tx/0xeth");
    expect(getBuildBotExplorerTxUrl("ethereum-sepolia", "0xethsep")).toBe(
      "https://sepolia.etherscan.io/tx/0xethsep"
    );
    expect(getBuildBotExplorerTxUrl("SEPOLIA", "0xsepolia")).toBe(
      "https://sepolia.etherscan.io/tx/0xsepolia"
    );
  });
});
