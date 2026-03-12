import type { Hex } from "viem";
import { HEX_BYTES_REGEX } from "./constants";
import type { BudgetTcrConfig } from "./types";

export function parseBudgetTcrConfig(value: string): BudgetTcrConfig {
  const config = parseJsonObject(value, "Budget TCR config");
  const budgetBounds = parseJsonRecord(config, "budgetBounds", "Budget TCR config.budgetBounds");
  const oracleBounds = parseJsonRecord(config, "oracleBounds", "Budget TCR config.oracleBounds");
  const arbitratorParams = parseJsonRecord(
    config,
    "arbitratorParams",
    "Budget TCR config.arbitratorParams"
  );

  return {
    submissionBaseDeposit: parseJsonUint256(
      config.submissionBaseDeposit,
      "Budget TCR config.submissionBaseDeposit"
    ),
    removalBaseDeposit: parseJsonUint256(
      config.removalBaseDeposit,
      "Budget TCR config.removalBaseDeposit"
    ),
    submissionChallengeBaseDeposit: parseJsonUint256(
      config.submissionChallengeBaseDeposit,
      "Budget TCR config.submissionChallengeBaseDeposit"
    ),
    removalChallengeBaseDeposit: parseJsonUint256(
      config.removalChallengeBaseDeposit,
      "Budget TCR config.removalChallengeBaseDeposit"
    ),
    registrationMetaEvidence: parseJsonNonEmptyString(
      config.registrationMetaEvidence,
      "Budget TCR config.registrationMetaEvidence"
    ),
    clearingMetaEvidence: parseJsonNonEmptyString(
      config.clearingMetaEvidence,
      "Budget TCR config.clearingMetaEvidence"
    ),
    challengePeriodDuration: parseJsonUint256(
      config.challengePeriodDuration,
      "Budget TCR config.challengePeriodDuration"
    ),
    arbitratorExtraData: parseJsonHexBytes(
      config.arbitratorExtraData ?? "0x",
      "Budget TCR config.arbitratorExtraData"
    ),
    budgetBounds: {
      minFundingLeadTime: parseJsonUint256(
        budgetBounds.minFundingLeadTime,
        "Budget TCR config.budgetBounds.minFundingLeadTime"
      ),
      maxFundingHorizon: parseJsonUint256(
        budgetBounds.maxFundingHorizon,
        "Budget TCR config.budgetBounds.maxFundingHorizon"
      ),
      minExecutionDuration: parseJsonUint256(
        budgetBounds.minExecutionDuration,
        "Budget TCR config.budgetBounds.minExecutionDuration"
      ),
      maxExecutionDuration: parseJsonUint256(
        budgetBounds.maxExecutionDuration,
        "Budget TCR config.budgetBounds.maxExecutionDuration"
      ),
      minActivationThreshold: parseJsonUint256(
        budgetBounds.minActivationThreshold,
        "Budget TCR config.budgetBounds.minActivationThreshold"
      ),
      maxActivationThreshold: parseJsonUint256(
        budgetBounds.maxActivationThreshold,
        "Budget TCR config.budgetBounds.maxActivationThreshold"
      ),
      maxRunwayCap: parseJsonUint256(
        budgetBounds.maxRunwayCap,
        "Budget TCR config.budgetBounds.maxRunwayCap"
      ),
    },
    oracleBounds: {
      liveness: parseJsonUint256(oracleBounds.liveness, "Budget TCR config.oracleBounds.liveness"),
      bondAmount: parseJsonUint256(
        oracleBounds.bondAmount,
        "Budget TCR config.oracleBounds.bondAmount"
      ),
    },
    arbitratorParams: {
      votingPeriod: parseJsonUint256(
        arbitratorParams.votingPeriod,
        "Budget TCR config.arbitratorParams.votingPeriod"
      ),
      votingDelay: parseJsonUint256(
        arbitratorParams.votingDelay,
        "Budget TCR config.arbitratorParams.votingDelay"
      ),
      revealPeriod: parseJsonUint256(
        arbitratorParams.revealPeriod,
        "Budget TCR config.arbitratorParams.revealPeriod"
      ),
      arbitrationCost: parseJsonUint256(
        arbitratorParams.arbitrationCost,
        "Budget TCR config.arbitratorParams.arbitrationCost"
      ),
      wrongOrMissedSlashBps: parseJsonBps(
        arbitratorParams.wrongOrMissedSlashBps,
        "Budget TCR config.arbitratorParams.wrongOrMissedSlashBps"
      ),
      slashCallerBountyBps: parseJsonBps(
        arbitratorParams.slashCallerBountyBps,
        "Budget TCR config.arbitratorParams.slashCallerBountyBps"
      ),
    },
  };
}

function parseJsonObject(value: string, label: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

function parseJsonUint256(value: unknown, label: string): bigint {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${label} must be a whole number.`);
    }
    if (!Number.isSafeInteger(value)) {
      throw new Error(
        `${label} must be provided as a decimal string when it exceeds Number.MAX_SAFE_INTEGER.`
      );
    }
    return BigInt(value);
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be a whole number.`);
  }

  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${label} must be a whole number.`);
  }

  return BigInt(normalized);
}

function parseJsonNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value.trim();
}

function parseJsonHexBytes(value: unknown, label: string): Hex {
  if (typeof value !== "string") {
    throw new Error(`${label} must be 0x-prefixed hex bytes.`);
  }

  const normalized = value.trim();
  if (!HEX_BYTES_REGEX.test(normalized)) {
    throw new Error(`${label} must be 0x-prefixed hex bytes.`);
  }

  return normalized.toLowerCase() as Hex;
}

function parseJsonRecord(
  parent: Record<string, unknown>,
  key: string,
  label: string
): Record<string, unknown> {
  const value = parent[key];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function parseJsonBps(value: unknown, label: string): bigint {
  const parsed = parseJsonUint256(value, label);
  if (parsed > 10_000n) {
    throw new Error(`${label} must be 10000 or less.`);
  }
  return parsed;
}
