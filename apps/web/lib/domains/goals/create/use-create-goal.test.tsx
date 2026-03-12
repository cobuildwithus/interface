/**
 * @vitest-environment happy-dom
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateGoalFormState } from "./types";
import { useCreateGoal } from "./use-create-goal";

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

const {
  buildGoalCreateTransactionMock,
  extractCreateGoalDeploymentStateMock,
  prepareWalletMock,
  pushMock,
  useContractTransactionMock,
  usePublicClientMock,
  writeContractAsyncMock,
} = vi.hoisted(() => ({
  buildGoalCreateTransactionMock: vi.fn(),
  extractCreateGoalDeploymentStateMock: vi.fn(),
  prepareWalletMock: vi.fn(),
  pushMock: vi.fn(),
  useContractTransactionMock: vi.fn(),
  usePublicClientMock: vi.fn(),
  writeContractAsyncMock: vi.fn(),
}));

vi.mock("@cobuild/wire", async () => {
  const actual = await vi.importActual<typeof import("@cobuild/wire")>("@cobuild/wire");
  return {
    ...actual,
    buildGoalCreateTransaction: (...args: Parameters<typeof actual.buildGoalCreateTransaction>) =>
      buildGoalCreateTransactionMock(...args),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("wagmi", () => ({
  usePublicClient: (args: ReactNode) => usePublicClientMock(args),
}));

vi.mock("@/lib/domains/token/onchain/use-contract-transaction", () => ({
  useContractTransaction: (args: ReactNode) => useContractTransactionMock(args),
}));

vi.mock("./deployment", () => ({
  extractCreateGoalDeploymentState: (...args: unknown[]) =>
    extractCreateGoalDeploymentStateMock(...args),
}));

describe("useCreateGoal", () => {
  beforeEach(() => {
    buildGoalCreateTransactionMock.mockReset();
    extractCreateGoalDeploymentStateMock.mockReset();
    prepareWalletMock.mockReset();
    pushMock.mockReset();
    useContractTransactionMock.mockReset();
    usePublicClientMock.mockReset();
    writeContractAsyncMock.mockReset();

    buildGoalCreateTransactionMock.mockReturnValue({
      to: "0x00000000000000000000000000000000000000ff",
    });
    prepareWalletMock.mockResolvedValue(undefined);
    writeContractAsyncMock.mockResolvedValue("0xhash");
    usePublicClientMock.mockReturnValue(null);
    useContractTransactionMock.mockReturnValue({
      prepareWallet: prepareWalletMock,
      writeContractAsync: writeContractAsyncMock,
      account: "0x00000000000000000000000000000000000000ee",
      isLoading: false,
    });
    extractCreateGoalDeploymentStateMock.mockReturnValue({
      txHash: "0xhash",
      goalTreasury: null,
    });
  });

  it("stores the tx hash when deployment confirmation arrives without a public client", async () => {
    const { result } = renderHook(() => useCreateGoal());
    const txOptions = useContractTransactionMock.mock.calls[0]?.[0] as {
      onSuccess?: (hash: string) => void;
    };

    await act(async () => {
      txOptions.onSuccess?.("0xhash");
    });

    await waitFor(() => {
      expect(result.current.deployment).toEqual({ txHash: "0xhash" });
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("reads the receipt and routes to the new treasury when deployment details are available", async () => {
    const getTransactionReceipt = vi.fn(async () => ({ logs: [{ topics: [] }] }));
    usePublicClientMock.mockReturnValue({ getTransactionReceipt });
    extractCreateGoalDeploymentStateMock.mockReturnValue({
      txHash: "0xhash",
      goalTreasury: "0x00000000000000000000000000000000000000ab",
    });

    const { result } = renderHook(() => useCreateGoal());
    const txOptions = useContractTransactionMock.mock.calls[0]?.[0] as {
      onSuccess?: (hash: string) => void;
    };

    await act(async () => {
      txOptions.onSuccess?.("0xhash");
    });

    await waitFor(() => {
      expect(getTransactionReceipt).toHaveBeenCalledWith({ hash: "0xhash" });
      expect(result.current.deployment).toEqual({
        txHash: "0xhash",
        goalTreasury: "0x00000000000000000000000000000000000000ab",
      });
      expect(pushMock).toHaveBeenCalledWith("/0x00000000000000000000000000000000000000ab");
    });
  });

  it("stores deployment details without routing when the receipt has no treasury address", async () => {
    const getTransactionReceipt = vi.fn(async () => ({ logs: [{ topics: [] }] }));
    usePublicClientMock.mockReturnValue({ getTransactionReceipt });
    extractCreateGoalDeploymentStateMock.mockReturnValue({
      txHash: "0xhash",
      goalTreasury: undefined,
      goalFlow: "0x00000000000000000000000000000000000000cd",
      goalRevnetId: "138",
    });

    const { result } = renderHook(() => useCreateGoal());
    const txOptions = useContractTransactionMock.mock.calls[0]?.[0] as {
      onSuccess?: (hash: string) => void;
    };

    await act(async () => {
      txOptions.onSuccess?.("0xhash");
    });

    await waitFor(() => {
      expect(getTransactionReceipt).toHaveBeenCalledWith({ hash: "0xhash" });
      expect(result.current.deployment).toEqual({
        txHash: "0xhash",
        goalTreasury: undefined,
        goalFlow: "0x00000000000000000000000000000000000000cd",
        goalRevnetId: "138",
      });
    });
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("falls back to the tx hash when receipt lookup fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    usePublicClientMock.mockReturnValue({
      getTransactionReceipt: vi.fn(async () => {
        throw new Error("receipt failed");
      }),
    });

    try {
      const { result } = renderHook(() => useCreateGoal());
      const txOptions = useContractTransactionMock.mock.calls[0]?.[0] as {
        onSuccess?: (hash: string) => void;
      };

      await act(async () => {
        txOptions.onSuccess?.("0xhash");
      });

      await waitFor(() => {
        expect(result.current.deployment).toEqual({ txHash: "0xhash" });
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(pushMock).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("returns after wallet preparation when the transaction hook has no account", async () => {
    useContractTransactionMock.mockReturnValue({
      prepareWallet: prepareWalletMock,
      writeContractAsync: writeContractAsyncMock,
      account: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useCreateGoal());

    await act(async () => {
      await result.current.createGoal(createForm());
    });

    expect(prepareWalletMock).toHaveBeenCalledTimes(1);
    expect(writeContractAsyncMock).not.toHaveBeenCalled();
    expect(result.current.formError).toBeNull();
  });

  it("surfaces the generic error message for non-Error failures", async () => {
    buildGoalCreateTransactionMock.mockImplementationOnce(() => {
      throw "boom";
    });

    const { result } = renderHook(() => useCreateGoal());

    await act(async () => {
      await result.current.createGoal(createForm());
    });

    expect(result.current.formError).toBe("Failed to deploy goal.");
    expect(prepareWalletMock).not.toHaveBeenCalled();
    expect(writeContractAsyncMock).not.toHaveBeenCalled();
  });
});

function createForm(overrides: Partial<CreateGoalFormState> = {}): CreateGoalFormState {
  return {
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
