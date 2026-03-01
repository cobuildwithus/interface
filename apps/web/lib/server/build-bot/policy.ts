import "server-only";

import { isAddress, parseEther, parseUnits } from "viem";
import { BuildBotPolicyError } from "./errors";

function getPolicyEnv(name: string): string | undefined {
  return process.env[`BUILD_BOT_${name}`] ?? process.env[`BROKER_${name}`];
}

function parseCsvSet(name: string): Set<string> {
  const raw = getPolicyEnv(name);
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  );
}

function parseBooleanEnv(name: string): boolean {
  const raw = getPolicyEnv(name)?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function isStrictModeEnabled(): boolean {
  return parseBooleanEnv("STRICT");
}

function isStrictRecipientAllowlistRequired(): boolean {
  return parseBooleanEnv("STRICT_REQUIRE_ALLOWED_RECIPIENTS");
}

function parsePositiveDecimalEnv(name: string): string | null {
  const raw = getPolicyEnv(name)?.trim();
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid ${name} env value`);
  }
  return raw;
}

function assertStrictBaseline(kind: "transfer" | "tx") {
  if (!isStrictModeEnabled()) return;

  if (parseCsvSet("ALLOWED_NETWORKS").size === 0) {
    throw new BuildBotPolicyError(
      "Strict mode requires BUILD_BOT_ALLOWED_NETWORKS (or BROKER_ALLOWED_NETWORKS)"
    );
  }

  if (!parsePositiveDecimalEnv("MAX_ETH_PER_TX")) {
    throw new BuildBotPolicyError(
      "Strict mode requires BUILD_BOT_MAX_ETH_PER_TX (or BROKER_MAX_ETH_PER_TX)"
    );
  }

  if (!parsePositiveDecimalEnv("MAX_USDC_PER_TX")) {
    throw new BuildBotPolicyError(
      "Strict mode requires BUILD_BOT_MAX_USDC_PER_TX (or BROKER_MAX_USDC_PER_TX)"
    );
  }

  if (kind === "transfer" && isStrictRecipientAllowlistRequired()) {
    if (parseCsvSet("ALLOWED_RECIPIENTS").size === 0) {
      throw new BuildBotPolicyError(
        "Strict mode requires BUILD_BOT_ALLOWED_RECIPIENTS when STRICT_REQUIRE_ALLOWED_RECIPIENTS is enabled"
      );
    }
  }
}

function assertNetworkAllowed(network: string) {
  const allowed = parseCsvSet("ALLOWED_NETWORKS");
  if (allowed.size === 0) return;

  if (!allowed.has(network.toLowerCase())) {
    throw new BuildBotPolicyError(`Network not allowed: ${network}`);
  }
}

function assertRecipientAllowed(to: string) {
  const recipients = parseCsvSet("ALLOWED_RECIPIENTS");
  if (recipients.size === 0) return;

  if (!recipients.has(to.toLowerCase())) {
    throw new BuildBotPolicyError("Recipient is not allowlisted");
  }
}

function assertTxContractAllowed(to: string) {
  const contracts = parseCsvSet("ALLOWED_CONTRACTS");

  if (contracts.size === 0) {
    throw new BuildBotPolicyError(
      "Generic tx is disabled. Set BUILD_BOT_ALLOWED_CONTRACTS to enable it"
    );
  }

  if (!contracts.has(to.toLowerCase())) {
    throw new BuildBotPolicyError("Contract is not allowlisted");
  }
}

function assertTokenContractAllowed(token: string) {
  if (!isAddress(token)) return;

  const contracts = parseCsvSet("ALLOWED_CONTRACTS");
  if (contracts.size === 0) return;

  if (!contracts.has(token.toLowerCase())) {
    throw new BuildBotPolicyError("Token contract is not allowlisted");
  }
}

function dataSelector(data: `0x${string}`): string | null {
  if (data.length < 10) return null;
  return data.slice(0, 10).toLowerCase();
}

function assertSelectorAllowed(data: `0x${string}`) {
  const contracts = parseCsvSet("ALLOWED_CONTRACTS");
  const selectors = parseCsvSet("ALLOWED_SELECTORS");
  if (isStrictModeEnabled() && contracts.size > 0 && selectors.size === 0) {
    throw new BuildBotPolicyError(
      "Strict mode requires BUILD_BOT_ALLOWED_SELECTORS when BUILD_BOT_ALLOWED_CONTRACTS is set"
    );
  }
  if (selectors.size === 0) return;

  const selector = dataSelector(data);
  if (!selector || !selectors.has(selector)) {
    throw new BuildBotPolicyError("Function selector is not allowlisted");
  }
}

function assertEthTransferCap(amountAtomic: bigint) {
  const maxEth = parsePositiveDecimalEnv("MAX_ETH_PER_TX");
  if (!maxEth) return;

  if (amountAtomic > parseEther(maxEth)) {
    throw new BuildBotPolicyError("ETH amount exceeds configured per-tx cap");
  }
}

function assertUsdcTransferCap(amountAtomic: bigint) {
  const maxUsdc = parsePositiveDecimalEnv("MAX_USDC_PER_TX");
  if (!maxUsdc) return;

  if (amountAtomic > parseUnits(maxUsdc, 6)) {
    throw new BuildBotPolicyError("USDC amount exceeds configured per-tx cap");
  }
}

export function assertBuildBotTransferAllowed(input: {
  network: string;
  to: string;
  token: string;
  amountAtomic: bigint;
}) {
  assertStrictBaseline("transfer");
  assertNetworkAllowed(input.network);
  assertRecipientAllowed(input.to);
  assertTokenContractAllowed(input.token);

  const token = input.token.toLowerCase();
  if (token === "eth") {
    assertEthTransferCap(input.amountAtomic);
  }
  if (token === "usdc") {
    assertUsdcTransferCap(input.amountAtomic);
  }
}

export function assertBuildBotTxAllowed(input: {
  network: string;
  to: string;
  valueWei: bigint;
  data: `0x${string}`;
}) {
  assertStrictBaseline("tx");
  assertNetworkAllowed(input.network);
  assertRecipientAllowed(input.to);
  assertTxContractAllowed(input.to);
  assertSelectorAllowed(input.data);
  assertEthTransferCap(input.valueWei);
}
