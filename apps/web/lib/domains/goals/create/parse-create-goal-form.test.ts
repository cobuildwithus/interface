import { describe, expect, it } from "vitest";
import { INITIAL_CREATE_GOAL_FORM_STATE, MAX_UINT32 } from "./constants";
import { parseBudgetTcrConfig } from "./parse-budget-tcr-config";
import { parseCreateGoalForm } from "./parse-create-goal-form";
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

describe("parseBudgetTcrConfig", () => {
  it("accepts safe integer JSON numbers and defaults arbitrator extra data", () => {
    const parsed = parseBudgetTcrConfig(
      JSON.stringify({
        submissionBaseDeposit: 10,
        removalBaseDeposit: 11,
        submissionChallengeBaseDeposit: 12,
        removalChallengeBaseDeposit: 13,
        registrationMetaEvidence: " ipfs://registration ",
        clearingMetaEvidence: " ipfs://clearing ",
        challengePeriodDuration: 86400,
        budgetBounds: {
          minFundingLeadTime: 1,
          maxFundingHorizon: 2,
          minExecutionDuration: 3,
          maxExecutionDuration: 4,
          minActivationThreshold: 5,
          maxActivationThreshold: 6,
          maxRunwayCap: 7,
        },
        oracleBounds: {
          liveness: 8,
          bondAmount: 9,
        },
        arbitratorParams: {
          votingPeriod: 10,
          votingDelay: 11,
          revealPeriod: 12,
          arbitrationCost: 13,
          wrongOrMissedSlashBps: 14,
          slashCallerBountyBps: 15,
        },
      })
    );

    expect(parsed.registrationMetaEvidence).toBe("ipfs://registration");
    expect(parsed.clearingMetaEvidence).toBe("ipfs://clearing");
    expect(parsed.arbitratorExtraData).toBe("0x");
    expect(parsed.oracleBounds.bondAmount).toBe(9n);
    expect(parsed.arbitratorParams.slashCallerBountyBps).toBe(15n);
  });

  it.each([
    ["", "Budget TCR config is required."],
    ['{"oops"', "Budget TCR config must be valid JSON."],
    ["[]", "Budget TCR config must be a JSON object."],
  ])("rejects malformed root config %s", (value, message) => {
    expect(() => parseBudgetTcrConfig(value)).toThrow(message);
  });

  it("rejects non-object nested config sections", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          budgetBounds: [],
        })
      )
    ).toThrow("Budget TCR config.budgetBounds must be a JSON object.");
  });

  it("rejects invalid hex byte strings", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          arbitratorExtraData: "1234",
        })
      )
    ).toThrow("Budget TCR config.arbitratorExtraData must be 0x-prefixed hex bytes.");
  });

  it("rejects blank meta evidence strings", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          registrationMetaEvidence: "   ",
        })
      )
    ).toThrow("Budget TCR config.registrationMetaEvidence must be a non-empty string.");
  });

  it("rejects unsafe integer JSON numbers", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          submissionBaseDeposit: 9007199254740992,
        })
      )
    ).toThrow(
      "Budget TCR config.submissionBaseDeposit must be provided as a decimal string when it exceeds Number.MAX_SAFE_INTEGER."
    );
  });

  it("rejects fractional JSON numbers", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          submissionBaseDeposit: 1.5,
        })
      )
    ).toThrow("Budget TCR config.submissionBaseDeposit must be a whole number.");
  });

  it("rejects non-string whole-number fields", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          submissionBaseDeposit: true,
        })
      )
    ).toThrow("Budget TCR config.submissionBaseDeposit must be a whole number.");
  });

  it("rejects non-decimal whole-number strings", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          submissionBaseDeposit: "1.5",
        })
      )
    ).toThrow("Budget TCR config.submissionBaseDeposit must be a whole number.");
  });

  it("rejects non-string arbitrator extra data", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          arbitratorExtraData: 1234,
        })
      )
    ).toThrow("Budget TCR config.arbitratorExtraData must be 0x-prefixed hex bytes.");
  });

  it("rejects slash basis points above 10000", () => {
    expect(() =>
      parseBudgetTcrConfig(
        JSON.stringify({
          ...JSON.parse(VALID_BUDGET_TCR_CONFIG),
          arbitratorParams: {
            ...JSON.parse(VALID_BUDGET_TCR_CONFIG).arbitratorParams,
            wrongOrMissedSlashBps: "10001",
          },
        })
      )
    ).toThrow("Budget TCR config.arbitratorParams.wrongOrMissedSlashBps must be 10000 or less.");
  });
});

describe("parseCreateGoalForm", () => {
  it.each([
    [{ goalName: "   " }, "Goal name is required."],
    [{ goalTicker: "   " }, "Goal ticker is required."],
    [{ goalUri: "   " }, "Goal URI is required."],
    [{ description: "   " }, "Description is required."],
    [{ successSpec: "   " }, "Success spec is required."],
    [{ successPolicy: "   " }, "Success policy is required."],
  ])("requires %o", (overrides, message) => {
    expect(() => parseCreateGoalForm(createForm(overrides))).toThrow(message);
  });

  it("parses valid input with trimmed strings and zero min-raise window", () => {
    const parsed = parseCreateGoalForm(
      createForm({
        goalName: " Goal Name ",
        goalTicker: " goal ",
        goalUri: " ipfs://goal ",
        description: " Description ",
        successSpec: " Success spec ",
        successPolicy: " Success policy ",
        tagline: " Tagline ",
        imageUrl: " https://example.com/goal.png ",
        websiteUrl: " https://example.com ",
        minRaiseWindowDays: "0",
      })
    );

    expect(parsed.goalName).toBe("Goal Name");
    expect(parsed.goalTicker).toBe("GOAL");
    expect(parsed.goalUri).toBe("ipfs://goal");
    expect(parsed.description).toBe("Description");
    expect(parsed.tagline).toBe("Tagline");
    expect(parsed.imageUrl).toBe("https://example.com/goal.png");
    expect(parsed.websiteUrl).toBe("https://example.com");
    expect(parsed.minRaiseWindowSeconds).toBe(0);
  });

  it("rejects goal tickers longer than twelve characters", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          goalTicker: "TOO-LONG-TICKER",
        })
      )
    ).toThrow("Goal ticker must be 12 characters or fewer.");
  });

  it("rejects non-whole duration values", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          durationDays: "1.5",
        })
      )
    ).toThrow("Duration (days) must be a whole number.");
  });

  it("rejects zero initial issuance", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          initialIssuance: "0",
        })
      )
    ).toThrow("Initial issuance must be greater than 0.");
  });

  it("requires initial issuance and rejects invalid decimals", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          initialIssuance: "   ",
        })
      )
    ).toThrow("Initial issuance is required.");

    expect(() =>
      parseCreateGoalForm(
        createForm({
          initialIssuance: "nope",
        })
      )
    ).toThrow("Initial issuance must be a valid decimal number.");
  });

  it("rejects zero success liveness", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          successLivenessHours: "0",
        })
      )
    ).toThrow("Assertion liveness (hours) must be at least 1.");
  });

  it("rejects duration values that exceed uint32 limits", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          durationDays: String(Math.floor(MAX_UINT32 / 86_400) + 1),
        })
      )
    ).toThrow("Duration values exceed uint32 limits.");
  });

  it("rejects non-integer assertion bonds", () => {
    expect(() =>
      parseCreateGoalForm(
        createForm({
          successBond: "1.5",
        })
      )
    ).toThrow("Assertion bond must be a whole number.");
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
