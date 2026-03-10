/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import * as wire from "@cobuild/wire";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateGoalForm } from "./create-goal-form";

const {
  pushMock,
  usePublicClientMock,
  useContractTransactionMock,
  buildGoalCreateTransactionMock,
  decodeGoalDeployedEventMock,
  prepareWalletMock,
  writeContractAsyncMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  usePublicClientMock: vi.fn(),
  useContractTransactionMock: vi.fn(),
  buildGoalCreateTransactionMock: vi.fn(),
  decodeGoalDeployedEventMock: vi.fn(),
  prepareWalletMock: vi.fn(),
  writeContractAsyncMock: vi.fn(),
}));

vi.mock("@cobuild/wire", async () => {
  const actual = await vi.importActual<typeof import("@cobuild/wire")>("@cobuild/wire");
  return {
    ...actual,
    buildGoalCreateTransaction: (...args: Parameters<typeof actual.buildGoalCreateTransaction>) =>
      buildGoalCreateTransactionMock(...args),
    decodeGoalDeployedEvent: (...args: Parameters<typeof actual.decodeGoalDeployedEvent>) =>
      decodeGoalDeployedEventMock(...args),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("wagmi", () => ({
  usePublicClient: (args: unknown) => usePublicClientMock(args),
}));

vi.mock("@/lib/domains/token/onchain/use-contract-transaction", () => ({
  useContractTransaction: (opts: unknown) => useContractTransactionMock(opts),
}));

vi.mock("@/components/ui/auth-button", () => ({
  AuthButton: ({
    children,
    onClick,
    disabled,
    className,
    connectLabel,
  }: {
    children?: ReactNode;
    onClick?: () => void | Promise<void>;
    disabled?: boolean;
    className?: string;
    connectLabel?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children ?? connectLabel}
    </button>
  ),
}));

function fillValidGoalCreateForm(): void {
  fireEvent.change(screen.getByLabelText("Goal name"), {
    target: { value: "Goal" },
  });
  fireEvent.change(screen.getByLabelText("Ticker"), {
    target: { value: "GOAL" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Goal flow" },
  });
  fireEvent.change(screen.getByLabelText("Success spec (plain text hashed to bytes32)"), {
    target: { value: "Spec" },
  });
  fireEvent.change(screen.getByLabelText("Success policy (plain text hashed to bytes32)"), {
    target: { value: "Policy" },
  });
  fireEvent.change(screen.getByLabelText("Goal spend policy"), {
    target: { value: "0x00000000000000000000000000000000000000cc" },
  });
  fireEvent.change(screen.getByLabelText("Budget spend policy"), {
    target: { value: "0x00000000000000000000000000000000000000dd" },
  });
}

describe("CreateGoalForm", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<typeof import("@cobuild/wire")>("@cobuild/wire");

    pushMock.mockReset();
    usePublicClientMock.mockReset();
    useContractTransactionMock.mockReset();
    buildGoalCreateTransactionMock.mockReset();
    decodeGoalDeployedEventMock.mockReset();
    prepareWalletMock.mockReset();
    writeContractAsyncMock.mockReset();

    usePublicClientMock.mockReturnValue(null);
    buildGoalCreateTransactionMock.mockImplementation(actual.buildGoalCreateTransaction);
    decodeGoalDeployedEventMock.mockImplementation(actual.decodeGoalDeployedEvent);
    prepareWalletMock.mockResolvedValue(undefined);
    writeContractAsyncMock.mockResolvedValue("0xhash");
    useContractTransactionMock.mockReturnValue({
      prepareWallet: prepareWalletMock,
      writeContractAsync: writeContractAsyncMock,
      account: null,
      isLoading: false,
    });
  });

  it("does not prepare wallet when the required spend-policy inputs are missing", async () => {
    render(<CreateGoalForm />);

    fillValidGoalCreateForm();
    fireEvent.change(screen.getByLabelText("Goal spend policy"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    expect(
      await screen.findByText(/Goal spend policy must be a valid 20-byte hex address/)
    ).toBeInTheDocument();
    expect(prepareWalletMock).not.toHaveBeenCalled();
    expect(writeContractAsyncMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not prepare wallet when budget spend policy is missing", async () => {
    render(<CreateGoalForm />);

    fillValidGoalCreateForm();
    fireEvent.change(screen.getByLabelText("Budget spend policy"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    expect(
      await screen.findByText(/Budget spend policy must be a valid 20-byte hex address/)
    ).toBeInTheDocument();
    expect(prepareWalletMock).not.toHaveBeenCalled();
    expect(writeContractAsyncMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("surfaces shared wire preflight failures before preparing the wallet", async () => {
    buildGoalCreateTransactionMock.mockImplementationOnce(() => {
      throw new Error("wire preflight failed");
    });

    render(<CreateGoalForm />);
    fillValidGoalCreateForm();

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    expect(await screen.findByText("wire preflight failed")).toBeInTheDocument();
    expect(prepareWalletMock).not.toHaveBeenCalled();
    expect(writeContractAsyncMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("builds the current GoalFactory deploy shape through the shared wire planner and ABI", async () => {
    useContractTransactionMock.mockReturnValue({
      prepareWallet: prepareWalletMock,
      writeContractAsync: writeContractAsyncMock,
      account: "0x00000000000000000000000000000000000000aa",
      isLoading: false,
    });

    render(<CreateGoalForm />);
    fillValidGoalCreateForm();

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    await waitFor(() => {
      expect(prepareWalletMock).toHaveBeenCalledTimes(1);
      expect(writeContractAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(writeContractAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        address: wire.goalFactoryAddress.toLowerCase(),
        abi: wire.goalFactoryAbi,
        functionName: "deployGoal",
        chainId: 8453,
        args: [
          expect.objectContaining({
            revnet: expect.objectContaining({
              name: "Goal",
              ticker: "GOAL",
            }),
            underwriting: {
              budgetPremiumPpm: 0,
              budgetSlashPpm: 0,
            },
            budgetTCR: expect.objectContaining({
              allocationMechanismAdmin: "0x00000000000000000000000000000000000000aa",
              budgetSpendPolicy: "0x00000000000000000000000000000000000000dd",
            }),
            goalSpendPolicy: "0x00000000000000000000000000000000000000cc",
          }),
        ],
      })
    );

    const writeArgs = writeContractAsyncMock.mock.calls[0]?.[0] as {
      args: Array<Record<string, unknown>>;
    };
    const deployParams = writeArgs.args[0];
    expect((deployParams.revnet as Record<string, unknown>).owner).toBeUndefined();
    expect((deployParams.underwriting as Record<string, unknown>).coverageLambda).toBeUndefined();
  });

  it("hydrates deployment state and redirects from the shared GoalDeployed receipt decode", async () => {
    const getTransactionReceiptMock = vi.fn().mockResolvedValue({ logs: [{ data: "0x" }] });
    usePublicClientMock.mockReturnValue({
      getTransactionReceipt: getTransactionReceiptMock,
    });
    useContractTransactionMock.mockReturnValue({
      prepareWallet: prepareWalletMock,
      writeContractAsync: writeContractAsyncMock,
      account: "0x00000000000000000000000000000000000000aa",
      isLoading: false,
    });
    decodeGoalDeployedEventMock.mockReturnValue({
      caller: "0x00000000000000000000000000000000000000aa",
      goalRevnetId: 137n,
      stack: {
        goalRevnetId: 137n,
        goalToken: "0x1111111111111111111111111111111111111111",
        goalSuperToken: "0x1212121212121212121212121212121212121212",
        goalTreasury: "0x1414141414141414141414141414141414141414",
        goalFlow: "0x1515151515151515151515151515151515151515",
        goalFlowAllocationLedgerPipeline: "0x1616161616161616161616161616161616161616",
        stakeVault: "0x1717171717171717171717171717171717171717",
        budgetStakeLedger: "0x1818181818181818181818181818181818181818",
        splitHook: "0x1919191919191919191919191919191919191919",
        jurorSlasherRouter: "0x1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a",
        underwriterSlasherRouter: "0x1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b",
        successResolver: "0x1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c1c",
        budgetTCR: "0x1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d1d",
        arbitrator: "0x1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e1e",
      },
    } as ReturnType<typeof wire.decodeGoalDeployedEvent>);

    render(<CreateGoalForm />);
    fillValidGoalCreateForm();

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    await waitFor(() => {
      expect(prepareWalletMock).toHaveBeenCalledTimes(1);
      expect(writeContractAsyncMock).toHaveBeenCalledTimes(1);
    });

    const txOptions = useContractTransactionMock.mock.calls[0]?.[0] as {
      onSuccess: (hash: string) => void;
    };
    const txHash = `0x${"a".repeat(64)}`;
    txOptions.onSuccess(txHash);

    await waitFor(() => {
      expect(getTransactionReceiptMock).toHaveBeenCalledWith({ hash: txHash });
      expect(screen.getByText(`Transaction: ${txHash}`)).toBeInTheDocument();
      expect(screen.getByText("Goal Revnet ID: 137")).toBeInTheDocument();
      expect(
        screen.getByText("Goal Treasury: 0x1414141414141414141414141414141414141414")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Goal Flow: 0x1515151515151515151515151515151515151515")
      ).toBeInTheDocument();
    });
    expect(pushMock).toHaveBeenCalledWith("/0x1414141414141414141414141414141414141414");
  });
});
