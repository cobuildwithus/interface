import type { GoalFactoryDeployParams } from "@cobuild/wire";
import type { Address, Hex } from "viem";

export type CreateGoalFormState = {
  goalName: string;
  goalTicker: string;
  goalUri: string;
  description: string;
  tagline: string;
  imageUrl: string;
  websiteUrl: string;
  initialIssuance: string;
  minRaise: string;
  durationDays: string;
  minRaiseWindowDays: string;
  successSpec: string;
  successPolicy: string;
  successLivenessHours: string;
  successBond: string;
  successResolver: string;
  budgetSuccessResolver: string;
  goalSpendPolicy: string;
  budgetSpendPolicy: string;
  budgetTcrConfig: string;
};

export type CreateGoalFormFieldUpdater = <K extends keyof CreateGoalFormState>(
  key: K,
  value: CreateGoalFormState[K]
) => void;

export type CreateGoalDeploymentState = {
  txHash: string;
  goalTreasury?: string;
  goalFlow?: string;
  goalRevnetId?: string;
};

export type ParsedCreateGoalForm = {
  goalName: string;
  goalTicker: string;
  goalUri: string;
  description: string;
  tagline: string;
  imageUrl: string;
  websiteUrl: string;
  successSpec: string;
  successPolicy: string;
  initialIssuance: bigint;
  minRaise: bigint;
  durationSeconds: number;
  minRaiseWindowSeconds: number;
  successAssertionLiveness: bigint;
  successAssertionBond: bigint;
  successResolver: Address;
  budgetSuccessResolver: Address;
  goalSpendPolicy: Address;
  budgetSpendPolicy: Address;
  budgetTcrConfig: BudgetTcrConfig;
};

export type BudgetTcrConfig = {
  submissionBaseDeposit: bigint;
  removalBaseDeposit: bigint;
  submissionChallengeBaseDeposit: bigint;
  removalChallengeBaseDeposit: bigint;
  registrationMetaEvidence: string;
  clearingMetaEvidence: string;
  challengePeriodDuration: bigint;
  arbitratorExtraData: Hex;
  budgetBounds: {
    minFundingLeadTime: bigint;
    maxFundingHorizon: bigint;
    minExecutionDuration: bigint;
    maxExecutionDuration: bigint;
    minActivationThreshold: bigint;
    maxActivationThreshold: bigint;
    maxRunwayCap: bigint;
  };
  oracleBounds: {
    liveness: bigint;
    bondAmount: bigint;
  };
  arbitratorParams: {
    votingPeriod: bigint;
    votingDelay: bigint;
    revealPeriod: bigint;
    arbitrationCost: bigint;
    wrongOrMissedSlashBps: bigint;
    slashCallerBountyBps: bigint;
  };
};

export type CreateGoalDeployParams = GoalFactoryDeployParams;
