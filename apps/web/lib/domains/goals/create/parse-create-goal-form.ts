import { normalizeEvmAddress } from "@cobuild/wire";
import { parseUnits, type Address } from "viem";
import { MAX_UINT32 } from "./constants";
import { parseBudgetTcrConfig } from "./parse-budget-tcr-config";
import type { CreateGoalFormState, ParsedCreateGoalForm } from "./types";

export function parseCreateGoalForm(form: CreateGoalFormState): ParsedCreateGoalForm {
  const goalName = form.goalName.trim();
  if (!goalName) throw new Error("Goal name is required.");

  const goalTicker = form.goalTicker.trim().toUpperCase();
  if (!goalTicker) throw new Error("Goal ticker is required.");
  if (goalTicker.length > 12) throw new Error("Goal ticker must be 12 characters or fewer.");

  const goalUri = form.goalUri.trim();
  if (!goalUri) throw new Error("Goal URI is required.");

  const description = form.description.trim();
  if (!description) throw new Error("Description is required.");

  const successSpec = form.successSpec.trim();
  if (!successSpec) throw new Error("Success spec is required.");

  const successPolicy = form.successPolicy.trim();
  if (!successPolicy) throw new Error("Success policy is required.");

  const initialIssuance = parseTokenAmount(form.initialIssuance, "Initial issuance");
  if (initialIssuance <= 0n) {
    throw new Error("Initial issuance must be greater than 0.");
  }

  const minRaise = parseTokenAmount(form.minRaise, "Min raise");

  const durationDays = parseWholeNumber(form.durationDays, "Duration (days)", 1);
  const minRaiseWindowDays = parseWholeNumber(
    form.minRaiseWindowDays,
    "Min-raise window (days)",
    0
  );
  if (minRaiseWindowDays > durationDays) {
    throw new Error("Min-raise window must be less than or equal to duration.");
  }

  const durationSeconds = durationDays * 24 * 60 * 60;
  const minRaiseWindowSeconds = minRaiseWindowDays * 24 * 60 * 60;
  if (durationSeconds > MAX_UINT32 || minRaiseWindowSeconds > MAX_UINT32) {
    throw new Error("Duration values exceed uint32 limits.");
  }

  const successLivenessHours = parseWholeNumber(
    form.successLivenessHours,
    "Assertion liveness (hours)",
    1
  );

  return {
    goalName,
    goalTicker,
    goalUri,
    description,
    tagline: form.tagline.trim(),
    imageUrl: form.imageUrl.trim(),
    websiteUrl: form.websiteUrl.trim(),
    successSpec,
    successPolicy,
    initialIssuance,
    minRaise,
    durationSeconds,
    minRaiseWindowSeconds,
    successAssertionLiveness: BigInt(successLivenessHours * 60 * 60),
    successAssertionBond: parseUint256(form.successBond, "Assertion bond"),
    successResolver: normalizeEvmAddress(form.successResolver, "Success resolver") as Address,
    budgetSuccessResolver: normalizeEvmAddress(
      form.budgetSuccessResolver,
      "Budget success resolver"
    ) as Address,
    goalSpendPolicy: normalizeEvmAddress(form.goalSpendPolicy, "Goal spend policy") as Address,
    budgetSpendPolicy: normalizeEvmAddress(
      form.budgetSpendPolicy,
      "Budget spend policy"
    ) as Address,
    budgetTcrConfig: parseBudgetTcrConfig(form.budgetTcrConfig),
  };
}

function parseWholeNumber(value: string, label: string, min: number): number {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be a whole number.`);
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`${label} must be at least ${min}.`);
  }

  return parsed;
}

function parseTokenAmount(value: string, label: string): bigint {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required.`);
  }

  try {
    return parseUnits(trimmed, 18);
  } catch {
    throw new Error(`${label} must be a valid decimal number.`);
  }
}

function parseUint256(value: string, label: string): bigint {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  return BigInt(trimmed);
}
