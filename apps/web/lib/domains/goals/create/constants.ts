import { baseAddresses } from "@cobuild/wire";
import type { CreateGoalFormState } from "./types";

export const DEFAULT_RESERVED_PERCENT_BPS = 9900;
export const DEFAULT_CASH_OUT_TAX_BPS = 0;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const MAX_UINT32 = 4_294_967_295;
export const HEX_BYTES_REGEX = /^0x([0-9a-f]{2})*$/i;

export const BUDGET_TCR_CONFIG_PLACEHOLDER = `{
  "submissionBaseDeposit": "0",
  "removalBaseDeposit": "0",
  "submissionChallengeBaseDeposit": "0",
  "removalChallengeBaseDeposit": "0",
  "registrationMetaEvidence": "ipfs://registration-meta-evidence",
  "clearingMetaEvidence": "ipfs://clearing-meta-evidence",
  "challengePeriodDuration": "86400",
  "arbitratorExtraData": "0x",
  "budgetBounds": {
    "minFundingLeadTime": "0",
    "maxFundingHorizon": "2592000",
    "minExecutionDuration": "0",
    "maxExecutionDuration": "2592000",
    "minActivationThreshold": "0",
    "maxActivationThreshold": "1000000000000000000",
    "maxRunwayCap": "1000000000000000000"
  },
  "oracleBounds": {
    "liveness": "86400",
    "bondAmount": "1000000000000000000"
  },
  "arbitratorParams": {
    "votingPeriod": "86400",
    "votingDelay": "3600",
    "revealPeriod": "86400",
    "arbitrationCost": "1000000000000000",
    "wrongOrMissedSlashBps": "50",
    "slashCallerBountyBps": "100"
  }
}`;

export const DEFAULT_INVALID_ROUND_REWARDS_SINK =
  baseAddresses.defaults.defaultInvalidRoundRewardsSink.toLowerCase();
export const DEFAULT_SUBMISSION_DEPOSIT_STRATEGY =
  baseAddresses.defaults.defaultSubmissionDepositStrategy.toLowerCase();

export const INITIAL_CREATE_GOAL_FORM_STATE: CreateGoalFormState = {
  goalName: "",
  goalTicker: "",
  goalUri: "ipfs://",
  description: "",
  tagline: "",
  imageUrl: "",
  websiteUrl: "",
  initialIssuance: "1",
  minRaise: "100",
  durationDays: "30",
  minRaiseWindowDays: "7",
  successSpec: "",
  successPolicy: "",
  successLivenessHours: "24",
  successBond: "0",
  successResolver: "",
  budgetSuccessResolver: "",
  goalSpendPolicy: "",
  budgetSpendPolicy: "",
  budgetTcrConfig: "",
};
