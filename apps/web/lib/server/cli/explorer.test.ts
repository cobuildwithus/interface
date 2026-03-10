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
    expect(getCliExplorerTxUrl("base-sepolia", "0xsep")).toBeNull();
  });

  it("returns expected tx URLs for supported network aliases", () => {
    expect(getCliExplorerTxUrl("base", "0xbase")).toBe("https://basescan.org/tx/0xbase");
    expect(getCliExplorerTxUrl("BASE-MAINNET", "0xmainnet")).toBe(
      "https://basescan.org/tx/0xmainnet"
    );
  });
});
