import { keccak256, stringToHex, type Address } from "viem";
import {
  DEFAULT_CASH_OUT_TAX_BPS,
  DEFAULT_INVALID_ROUND_REWARDS_SINK,
  DEFAULT_RESERVED_PERCENT_BPS,
  DEFAULT_SUBMISSION_DEPOSIT_STRATEGY,
} from "./constants";
import type { CreateGoalDeployParams, ParsedCreateGoalForm } from "./types";

export function toDeployParams(
  allocationMechanismAdmin: Address,
  parsedForm: ParsedCreateGoalForm
): CreateGoalDeployParams {
  const successOracleSpecHash = keccak256(stringToHex(parsedForm.successSpec));
  const successAssertionPolicyHash = keccak256(stringToHex(parsedForm.successPolicy));

  return {
    revnet: {
      name: parsedForm.goalName,
      ticker: parsedForm.goalTicker,
      uri: parsedForm.goalUri,
      initialIssuance: parsedForm.initialIssuance,
      cashOutTaxRate: DEFAULT_CASH_OUT_TAX_BPS,
      reservedPercent: DEFAULT_RESERVED_PERCENT_BPS,
      durationSeconds: parsedForm.durationSeconds,
    },
    timing: {
      minRaise: parsedForm.minRaise,
      minRaiseDurationSeconds: parsedForm.minRaiseWindowSeconds,
    },
    success: {
      successResolver: parsedForm.successResolver,
      successAssertionLiveness: parsedForm.successAssertionLiveness,
      successAssertionBond: parsedForm.successAssertionBond,
      successOracleSpecHash,
      successAssertionPolicyHash,
    },
    flowMetadata: {
      title: parsedForm.goalName,
      description: parsedForm.description,
      image: parsedForm.imageUrl,
      tagline: parsedForm.tagline,
      url: parsedForm.websiteUrl,
    },
    underwriting: {
      budgetPremiumPpm: 0,
      budgetSlashPpm: 0,
    },
    budgetTCR: {
      allocationMechanismAdmin,
      invalidRoundRewardsSink: DEFAULT_INVALID_ROUND_REWARDS_SINK as Address,
      submissionDepositStrategy: DEFAULT_SUBMISSION_DEPOSIT_STRATEGY as Address,
      submissionBaseDeposit: parsedForm.budgetTcrConfig.submissionBaseDeposit,
      removalBaseDeposit: parsedForm.budgetTcrConfig.removalBaseDeposit,
      submissionChallengeBaseDeposit: parsedForm.budgetTcrConfig.submissionChallengeBaseDeposit,
      removalChallengeBaseDeposit: parsedForm.budgetTcrConfig.removalChallengeBaseDeposit,
      registrationMetaEvidence: parsedForm.budgetTcrConfig.registrationMetaEvidence,
      clearingMetaEvidence: parsedForm.budgetTcrConfig.clearingMetaEvidence,
      challengePeriodDuration: parsedForm.budgetTcrConfig.challengePeriodDuration,
      arbitratorExtraData: parsedForm.budgetTcrConfig.arbitratorExtraData,
      budgetBounds: parsedForm.budgetTcrConfig.budgetBounds,
      oracleBounds: parsedForm.budgetTcrConfig.oracleBounds,
      budgetSuccessResolver: parsedForm.budgetSuccessResolver,
      budgetSpendPolicy: parsedForm.budgetSpendPolicy,
      arbitratorParams: parsedForm.budgetTcrConfig.arbitratorParams,
    },
    goalSpendPolicy: parsedForm.goalSpendPolicy,
  };
}
