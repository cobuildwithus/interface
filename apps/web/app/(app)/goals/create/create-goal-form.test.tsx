/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateGoalForm } from "./create-goal-form";

const {
  pushMock,
  usePublicClientMock,
  useContractTransactionMock,
  prepareWalletMock,
  writeContractAsyncMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  usePublicClientMock: vi.fn(),
  useContractTransactionMock: vi.fn(),
  prepareWalletMock: vi.fn(),
  writeContractAsyncMock: vi.fn(),
}));

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

describe("CreateGoalForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    usePublicClientMock.mockReset();
    useContractTransactionMock.mockReset();
    prepareWalletMock.mockReset();
    writeContractAsyncMock.mockReset();

    usePublicClientMock.mockReturnValue(null);
    prepareWalletMock.mockResolvedValue(undefined);
    writeContractAsyncMock.mockResolvedValue("0xhash");
    useContractTransactionMock.mockReturnValue({
      prepareWallet: prepareWalletMock,
      writeContractAsync: writeContractAsyncMock,
      account: null,
      isLoading: false,
    });
  });

  it("does not prepare wallet when required fields are invalid", async () => {
    render(<CreateGoalForm />);

    fireEvent.click(screen.getByRole("button", { name: "Create goal" }));

    expect(await screen.findByText("Goal name is required.")).toBeInTheDocument();
    expect(prepareWalletMock).not.toHaveBeenCalled();
    expect(writeContractAsyncMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
