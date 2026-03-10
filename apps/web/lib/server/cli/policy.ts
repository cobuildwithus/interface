import "server-only";

import { isAddress, parseEther, parseUnits } from "viem";
import { CliPolicyError } from "./errors";
import {
  canonicalizeCliConfiguredNetwork,
  getCliEnv,
  parseCliBoolean,
  parseCliCsvSet,
} from "./env";

function isStrictModeEnabled(): boolean {
  return parseCliBoolean("STRICT");
}

function isStrictRecipientAllowlistRequired(): boolean {
  return parseCliBoolean("STRICT_REQUIRE_ALLOWED_RECIPIENTS");
}

function parsePositiveDecimalEnv(name: string): string | null {
  const raw = getCliEnv(name)?.trim();
  if (!raw) return null;
  if (!/^\d+(\.\d+)?$/.test(raw)) {
    throw new Error(`Invalid ${name} env value`);
  }
  return raw;
}

function assertStrictBaseline(kind: "transfer" | "tx") {
  if (!isStrictModeEnabled()) return;

  if (parseCliCsvSet("ALLOWED_NETWORKS").size === 0) {
    throw new CliPolicyError(
      "Strict mode requires CLI_ALLOWED_NETWORKS (or BROKER_ALLOWED_NETWORKS)"
    );
  }

  if (!parsePositiveDecimalEnv("MAX_ETH_PER_TX")) {
    throw new CliPolicyError("Strict mode requires CLI_MAX_ETH_PER_TX (or BROKER_MAX_ETH_PER_TX)");
  }

  if (!parsePositiveDecimalEnv("MAX_USDC_PER_TX")) {
    throw new CliPolicyError(
      "Strict mode requires CLI_MAX_USDC_PER_TX (or BROKER_MAX_USDC_PER_TX)"
    );
  }

  if (kind === "transfer" && isStrictRecipientAllowlistRequired()) {
    if (parseCliCsvSet("ALLOWED_RECIPIENTS").size === 0) {
      throw new CliPolicyError(
        "Strict mode requires CLI_ALLOWED_RECIPIENTS when STRICT_REQUIRE_ALLOWED_RECIPIENTS is enabled"
      );
    }
  }
}

function assertNetworkAllowed(network: string) {
  const allowed = new Set(
    [...parseCliCsvSet("ALLOWED_NETWORKS")]
      .map((value) => canonicalizeCliConfiguredNetwork(value))
      .filter((value): value is string => value !== null)
  );
  if (allowed.size === 0) return;

  const normalizedNetwork = canonicalizeCliConfiguredNetwork(network) ?? network.toLowerCase();
  if (!allowed.has(normalizedNetwork)) {
    throw new CliPolicyError(`Network not allowed: ${network}`);
  }
}

function assertRecipientAllowed(to: string) {
  const recipients = parseCliCsvSet("ALLOWED_RECIPIENTS");
  if (recipients.size === 0) return;

  if (!recipients.has(to.toLowerCase())) {
    throw new CliPolicyError("Recipient is not allowlisted");
  }
}

function assertTxContractAllowed(to: string) {
  const contracts = parseCliCsvSet("ALLOWED_CONTRACTS");

  if (contracts.size === 0) {
    throw new CliPolicyError("Generic tx is disabled. Set CLI_ALLOWED_CONTRACTS to enable it");
  }

  if (!contracts.has(to.toLowerCase())) {
    throw new CliPolicyError("Contract is not allowlisted");
  }
}

function assertTokenContractAllowed(token: string) {
  if (!isAddress(token)) return;

  const contracts = parseCliCsvSet("ALLOWED_CONTRACTS");
  if (contracts.size === 0) return;

  if (!contracts.has(token.toLowerCase())) {
    throw new CliPolicyError("Token contract is not allowlisted");
  }
}

function dataSelector(data: `0x${string}`): string | null {
  if (data.length < 10) return null;
  return data.slice(0, 10).toLowerCase();
}

function assertSelectorAllowed(data: `0x${string}`) {
  const contracts = parseCliCsvSet("ALLOWED_CONTRACTS");
  const selectors = parseCliCsvSet("ALLOWED_SELECTORS");
  if (isStrictModeEnabled() && contracts.size > 0 && selectors.size === 0) {
    throw new CliPolicyError(
      "Strict mode requires CLI_ALLOWED_SELECTORS when CLI_ALLOWED_CONTRACTS is set"
    );
  }
  if (selectors.size === 0) return;

  const selector = dataSelector(data);
  if (!selector || !selectors.has(selector)) {
    throw new CliPolicyError("Function selector is not allowlisted");
  }
}

function assertEthTransferCap(amountAtomic: bigint) {
  const maxEth = parsePositiveDecimalEnv("MAX_ETH_PER_TX");
  if (!maxEth) return;

  if (amountAtomic > parseEther(maxEth)) {
    throw new CliPolicyError("ETH amount exceeds configured per-tx cap");
  }
}

function assertUsdcTransferCap(amountAtomic: bigint) {
  const maxUsdc = parsePositiveDecimalEnv("MAX_USDC_PER_TX");
  if (!maxUsdc) return;

  if (amountAtomic > parseUnits(maxUsdc, 6)) {
    throw new CliPolicyError("USDC amount exceeds configured per-tx cap");
  }
}

export function assertCliTransferAllowed(input: {
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

export function assertCliTxAllowed(input: {
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
