import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseEther, parseUnits } from "viem";

vi.mock("server-only", () => ({}));

import { assertCliTransferAllowed, assertCliTxAllowed } from "@/lib/server/cli/policy";

const ORIGINAL_ENV = { ...process.env };

function setEnv(overrides: Record<string, string | undefined>) {
  process.env = {
    ...ORIGINAL_ENV,
    ...overrides,
  };
}

describe("cli policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("allows transfer when no limits are configured", () => {
    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).not.toThrow();
  });

  it("rejects ETH transfer above cap", () => {
    setEnv({ CLI_MAX_ETH_PER_TX: "0.01" });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.02"),
      })
    ).toThrow("ETH amount exceeds configured per-tx cap");
  });

  it("rejects USDC transfer above cap", () => {
    setEnv({ CLI_MAX_USDC_PER_TX: "1" });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "usdc",
        amountAtomic: parseUnits("2", 6),
      })
    ).toThrow("USDC amount exceeds configured per-tx cap");
  });

  it("rejects transfer when network is not allowlisted", () => {
    setEnv({ CLI_ALLOWED_NETWORKS: "optimism" });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).toThrow("Network not allowed: base");
  });

  it("rejects transfer when recipient is not allowlisted", () => {
    setEnv({ CLI_ALLOWED_RECIPIENTS: "0x000000000000000000000000000000000000dead" });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x0000000000000000000000000000000000000001",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).toThrow("Recipient is not allowlisted");
  });

  it("rejects token transfers for disallowed ERC-20 contracts", () => {
    setEnv({ CLI_ALLOWED_CONTRACTS: "0x000000000000000000000000000000000000dead" });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x0000000000000000000000000000000000000001",
        token: "0x000000000000000000000000000000000000beef",
        amountAtomic: parseUnits("1", 18),
      })
    ).toThrow("Token contract is not allowlisted");
  });

  it("treats allowlists as case-insensitive", () => {
    setEnv({
      CLI_ALLOWED_NETWORKS: "BASE-MAINNET",
      CLI_ALLOWED_RECIPIENTS: "0X000000000000000000000000000000000000DEAD",
      CLI_ALLOWED_CONTRACTS: "0X000000000000000000000000000000000000BEEF",
    });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "0x000000000000000000000000000000000000beef",
        amountAtomic: parseUnits("1", 18),
      })
    ).not.toThrow();
  });

  it("disables generic tx when contract allowlist is unset", () => {
    expect(() =>
      assertCliTxAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        valueWei: 0n,
        data: "0x12345678",
      })
    ).toThrow("Generic tx is disabled");
  });

  it("rejects tx when selector is not allowlisted", () => {
    setEnv({
      CLI_ALLOWED_CONTRACTS: "0x000000000000000000000000000000000000dead",
      CLI_ALLOWED_SELECTORS: "0xabcdef01",
    });

    expect(() =>
      assertCliTxAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        valueWei: 0n,
        data: "0x12345678",
      })
    ).toThrow("Function selector is not allowlisted");
  });

  it("allows tx when contract and selector are allowlisted", () => {
    setEnv({
      CLI_ALLOWED_CONTRACTS: "0x000000000000000000000000000000000000dead",
      CLI_ALLOWED_SELECTORS: "0x12345678",
    });

    expect(() =>
      assertCliTxAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        valueWei: 0n,
        data: "0x12345678",
      })
    ).not.toThrow();
  });

  it("requires allowed networks in strict mode", () => {
    setEnv({
      CLI_STRICT: "1",
      CLI_MAX_ETH_PER_TX: "0.01",
      CLI_MAX_USDC_PER_TX: "1",
    });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).toThrow("Strict mode requires CLI_ALLOWED_NETWORKS");
  });

  it("requires ETH and USDC caps in strict mode", () => {
    setEnv({
      CLI_STRICT: "1",
      CLI_ALLOWED_NETWORKS: "base",
    });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).toThrow("Strict mode requires CLI_MAX_ETH_PER_TX");

    setEnv({
      CLI_STRICT: "1",
      CLI_ALLOWED_NETWORKS: "base",
      CLI_MAX_ETH_PER_TX: "0.01",
    });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).toThrow("Strict mode requires CLI_MAX_USDC_PER_TX");
  });

  it("requires selector allowlist in strict mode when contracts are configured", () => {
    setEnv({
      CLI_STRICT: "1",
      CLI_ALLOWED_NETWORKS: "base",
      CLI_MAX_ETH_PER_TX: "0.01",
      CLI_MAX_USDC_PER_TX: "1",
      CLI_ALLOWED_CONTRACTS: "0x000000000000000000000000000000000000dead",
    });

    expect(() =>
      assertCliTxAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        valueWei: 0n,
        data: "0x12345678",
      })
    ).toThrow("Strict mode requires CLI_ALLOWED_SELECTORS");
  });

  it("optionally requires recipient allowlist in strict mode", () => {
    setEnv({
      CLI_STRICT: "1",
      CLI_STRICT_REQUIRE_ALLOWED_RECIPIENTS: "1",
      CLI_ALLOWED_NETWORKS: "base",
      CLI_MAX_ETH_PER_TX: "0.01",
      CLI_MAX_USDC_PER_TX: "1",
    });

    expect(() =>
      assertCliTransferAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        token: "eth",
        amountAtomic: parseEther("0.001"),
      })
    ).toThrow("Strict mode requires CLI_ALLOWED_RECIPIENTS");
  });

  it("supports BROKER_* env aliases", () => {
    setEnv({
      BROKER_ALLOWED_CONTRACTS: "0x000000000000000000000000000000000000dead",
      BROKER_ALLOWED_SELECTORS: "0x12345678",
      BROKER_MAX_ETH_PER_TX: "0.01",
    });

    expect(() =>
      assertCliTxAllowed({
        network: "base",
        to: "0x000000000000000000000000000000000000dEaD",
        valueWei: parseEther("0.02"),
        data: "0x12345678",
      })
    ).toThrow("ETH amount exceeds configured per-tx cap");
  });
});
