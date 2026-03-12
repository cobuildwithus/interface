import { normalizeEvmAddress } from "@cobuild/wire";
import { keccak256, parseUnits, stringToHex, type Address } from "viem";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CASH_OUT_TAX_BPS,
  DEFAULT_RESERVED_PERCENT_BPS,
  INITIAL_CREATE_GOAL_FORM_STATE,
} from "./constants";
import { parseCreateGoalForm } from "./parse-create-goal-form";
import { toDeployParams } from "./to-deploy-params";
import type { CreateGoalFormState } from "./types";

const VALID_BUDGET_TCR_CONFIG = JSON.stringify({
  submissionBaseDeposit: "10",
  removalBaseDeposit: "11",
  submissionChallengeBaseDeposit: "12",
  removalChallengeBaseDeposit: "13",
  registrationMetaEvidence: "ipfs://registration",
  clearingMetaEvidence: "ipfs://clearing",
  challengePeriodDuration: "86400",
  arbitratorExtraData: "0x1234",
  budgetBounds: {
    minFundingLeadTime: "1",
    maxFundingHorizon: "2592000",
    minExecutionDuration: "2",
    maxExecutionDuration: "2592001",
    minActivationThreshold: "3",
    maxActivationThreshold: "1000000000000000000",
    maxRunwayCap: "2000000000000000000",
  },
  oracleBounds: {
    liveness: "86400",
    bondAmount: "1000000000000000000",
  },
  arbitratorParams: {
    votingPeriod: "86400",
    votingDelay: "3600",
    revealPeriod: "86400",
    arbitrationCost: "1000000000000000",
    wrongOrMissedSlashBps: "50",
    slashCallerBountyBps: "100",
  },
});

describe("goal deploy params", () => {
  it("maps parsed form fields into deploy params without dropping goal or budget config", () => {
    const admin = normalizeEvmAddress(
      "0x00000000000000000000000000000000000000ee",
      "Allocation mechanism admin"
    ) as Address;
    const parsedForm = parseCreateGoalForm(
      createForm({
        goalName: " Goal Name ",
        goalTicker: " goal ",
        goalUri: " ipfs://goal-uri ",
        description: " Goal description ",
        tagline: " Tagline ",
        imageUrl: " https://example.com/goal.png ",
        websiteUrl: " https://example.com ",
        initialIssuance: "1.5",
        minRaise: "42",
        durationDays: "30",
        minRaiseWindowDays: "7",
        successSpec: "Goal succeeds when milestones land",
        successPolicy: "Resolver attests after review",
        successLivenessHours: "12",
        successBond: "123",
        successResolver: "0x00000000000000000000000000000000000000aa",
        budgetSuccessResolver: "0x00000000000000000000000000000000000000bb",
        goalSpendPolicy: "0x00000000000000000000000000000000000000cc",
        budgetSpendPolicy: "0x00000000000000000000000000000000000000dd",
        budgetTcrConfig: VALID_BUDGET_TCR_CONFIG,
      })
    );
    const deployParams = toDeployParams(admin, parsedForm);

    expect(deployParams).toMatchObject({
      revnet: {
        name: "Goal Name",
        ticker: "GOAL",
        uri: "ipfs://goal-uri",
        initialIssuance: parseUnits("1.5", 18),
        cashOutTaxRate: DEFAULT_CASH_OUT_TAX_BPS,
        reservedPercent: DEFAULT_RESERVED_PERCENT_BPS,
        durationSeconds: 30 * 24 * 60 * 60,
      },
      timing: {
        minRaise: parseUnits("42", 18),
        minRaiseDurationSeconds: 7 * 24 * 60 * 60,
      },
      success: {
        successResolver: normalizeEvmAddress(
          "0x00000000000000000000000000000000000000aa",
          "Success resolver"
        ),
        successAssertionLiveness: 12n * 60n * 60n,
        successAssertionBond: 123n,
        successOracleSpecHash: keccak256(stringToHex("Goal succeeds when milestones land")),
        successAssertionPolicyHash: keccak256(stringToHex("Resolver attests after review")),
      },
      flowMetadata: {
        title: "Goal Name",
        description: "Goal description",
        image: "https://example.com/goal.png",
        tagline: "Tagline",
        url: "https://example.com",
      },
      budgetTCR: {
        allocationMechanismAdmin: admin,
        budgetSuccessResolver: normalizeEvmAddress(
          "0x00000000000000000000000000000000000000bb",
          "Budget success resolver"
        ),
        budgetSpendPolicy: normalizeEvmAddress(
          "0x00000000000000000000000000000000000000dd",
          "Budget spend policy"
        ),
        submissionBaseDeposit: 10n,
        removalBaseDeposit: 11n,
        submissionChallengeBaseDeposit: 12n,
        removalChallengeBaseDeposit: 13n,
        registrationMetaEvidence: "ipfs://registration",
        clearingMetaEvidence: "ipfs://clearing",
        challengePeriodDuration: 86400n,
        arbitratorExtraData: "0x1234",
      },
      goalSpendPolicy: normalizeEvmAddress(
        "0x00000000000000000000000000000000000000cc",
        "Goal spend policy"
      ),
    });
    expect(deployParams.budgetTCR.budgetBounds).toEqual(parsedForm.budgetTcrConfig.budgetBounds);
    expect(deployParams.budgetTCR.oracleBounds).toEqual(parsedForm.budgetTcrConfig.oracleBounds);
    expect(deployParams.budgetTCR.arbitratorParams).toEqual(
      parsedForm.budgetTcrConfig.arbitratorParams
    );
  });

  it("rejects min-raise windows that exceed the overall duration", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          durationDays: "7",
          minRaiseWindowDays: "8",
        })
      )
    ).toThrow("Min-raise window must be less than or equal to duration.");
  });
});

function createForm(overrides: Partial<CreateGoalFormState> = {}): CreateGoalFormState {
  return {
    ...INITIAL_CREATE_GOAL_FORM_STATE,
    goalName: "Goal",
    goalTicker: "GOAL",
    goalUri: "ipfs://goal",
    description: "Goal description",
    tagline: "Tagline",
    imageUrl: "https://example.com/goal.png",
    websiteUrl: "https://example.com",
    initialIssuance: "1",
    minRaise: "100",
    durationDays: "30",
    minRaiseWindowDays: "7",
    successSpec: "Goal succeeds",
    successPolicy: "Resolver reviews",
    successLivenessHours: "24",
    successBond: "0",
    successResolver: "0x00000000000000000000000000000000000000aa",
    budgetSuccessResolver: "0x00000000000000000000000000000000000000bb",
    goalSpendPolicy: "0x00000000000000000000000000000000000000cc",
    budgetSpendPolicy: "0x00000000000000000000000000000000000000dd",
    budgetTcrConfig: VALID_BUDGET_TCR_CONFIG,
    ...overrides,
  };
}
