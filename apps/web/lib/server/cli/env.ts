import "server-only";
import { parseBaseOnlyNetwork } from "@cobuild/wire";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function getCliEnv(name: string): string | undefined {
  return process.env[`CLI_${name}`] ?? process.env[`BROKER_${name}`];
}

export function canonicalizeCliConfiguredNetwork(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return parseBaseOnlyNetwork(normalized) ?? normalized;
}

export function parseCliBoolean(name: string, defaultValue = false): boolean {
  const raw = getCliEnv(name)?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return TRUE_VALUES.has(raw);
}

export function parseCliCsvSet(name: string): Set<string> {
  const raw = getCliEnv(name);
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0)
  );
}

export function getCliAccountPolicyId(): string | null {
  const policyId = getCliEnv("ACCOUNT_POLICY_ID");
  return policyId?.trim() || null;
}

export function getCliDefaultNetwork(input?: string): string {
  const rawValue = input ?? getCliEnv("DEFAULT_NETWORK");
  if (!rawValue?.trim()) {
    return "base";
  }

  const normalized = parseBaseOnlyNetwork(rawValue);
  if (!normalized) {
    throw new Error(`Unsupported CLI default network: ${rawValue}`);
  }

  return normalized;
}
