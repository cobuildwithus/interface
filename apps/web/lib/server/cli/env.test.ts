import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canonicalizeCliConfiguredNetwork, getCliDefaultNetwork } from "@/lib/server/cli/env";

describe("cli env", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("canonicalizes configured Base aliases to the single Base-only network", () => {
    expect(canonicalizeCliConfiguredNetwork("base")).toBe("base");
    expect(canonicalizeCliConfiguredNetwork("BASE-MAINNET")).toBe("base");
    expect(canonicalizeCliConfiguredNetwork(" base-sepolia ")).toBe("base-sepolia");
    expect(canonicalizeCliConfiguredNetwork("ethereum")).toBe("ethereum");
  });

  it("defaults CLI network config to base", () => {
    delete process.env.CLI_DEFAULT_NETWORK;
    delete process.env.BROKER_DEFAULT_NETWORK;
    expect(getCliDefaultNetwork()).toBe("base");

    process.env.CLI_DEFAULT_NETWORK = "base-mainnet";
    expect(getCliDefaultNetwork()).toBe("base");

    process.env.BROKER_DEFAULT_NETWORK = "base-sepolia";
    delete process.env.CLI_DEFAULT_NETWORK;
    expect(() => getCliDefaultNetwork()).toThrow("Unsupported CLI default network: base-sepolia");
  });
});
