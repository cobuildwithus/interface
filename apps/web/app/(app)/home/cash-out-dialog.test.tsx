/**
 * @vitest-environment happy-dom
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useQueryMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const usePublicClientMock = vi.fn();
const quoteRevnetCashOutMock = vi.fn();
const useContractTransactionMock = vi.fn();
const routerRefreshMock = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (args: Parameters<typeof useQueryMock>[0]) => useQueryMock(args),
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock("wagmi", () => ({
  usePublicClient: (args: Parameters<typeof usePublicClientMock>[0]) => usePublicClientMock(args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock("@cobuild/wire", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cobuild/wire")>();
  return {
    ...actual,
    quoteRevnetCashOut: (...args: unknown[]) => quoteRevnetCashOutMock(...args),
  };
});

vi.mock("@/components/ui/auth-button", () => ({
  AuthButton: ({
    children,
    onClick,
    disabled,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/currency", () => ({
  Currency: ({ value }: { value: number }) => <span>{value}</span>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    onChange,
    value,
    placeholder,
  }: {
    onChange?: (event: { target: { value: string } }) => void;
    value?: string;
    placeholder?: string;
  }) => <input value={value} placeholder={placeholder} onChange={onChange} />,
}));

vi.mock("@/lib/domains/token/onchain/use-contract-transaction", () => ({
  useContractTransaction: (...args: unknown[]) => useContractTransactionMock(...args),
}));

import {
  REVNET_CASH_OUT_QUOTE_QUERY_KEY,
  REVNET_POSITION_QUERY_KEY,
} from "@/lib/hooks/use-revnet-position";
import { CashOutDialog } from "./cash-out-dialog";

function address(char: string): `0x${string}` {
  return ("0x" + char.repeat(40)) as `0x${string}`;
}

const POSITION = {
  account: address("1"),
  baseTokenAddress: address("2"),
  baseTokenContext: {
    token: address("2"),
    decimals: 6,
    currency: 1,
  },
  baseTokenSymbol: "USDC",
  cashOutValue: 0n,
  formattedBalance: "10",
  formattedCashOutValue: "0",
  isConnected: true,
  permissionsAddress: address("3"),
  projectId: 138n,
  projectIdNumber: 138,
  revLoansAddress: address("4"),
  terminalAddress: address("5"),
  tokenAddress: address("6"),
  tokenBalance: 10n * 10n ** 18n,
  tokenDecimals: 18,
  tokenSymbol: "REV",
};

describe("CashOutDialog", () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    invalidateQueriesMock.mockReset();
    usePublicClientMock.mockReset();
    quoteRevnetCashOutMock.mockReset();
    useContractTransactionMock.mockReset();
    routerRefreshMock.mockReset();
    useContractTransactionMock.mockReturnValue({
      isLoading: false,
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
    });
  });

  it("does not enable the quote query until an amount and quote context are present", () => {
    usePublicClientMock.mockReturnValue({ readContract: vi.fn() });
    useQueryMock.mockReturnValue({ data: null });

    render(
      <CashOutDialog
        position={{
          ...POSITION,
          terminalAddress: undefined,
        }}
      >
        <button type="button">Open</button>
      </CashOutDialog>
    );

    fireEvent.change(screen.getByPlaceholderText("0.0"), {
      target: { value: "1.5" },
    });

    const call = useQueryMock.mock.calls.at(-1)?.[0];
    expect(call?.enabled).toBe(false);
  });

  it("forwards the canonical quote inputs to the shared wire helper", async () => {
    const publicClient = { readContract: vi.fn() };
    const quote = {
      rawCashOutCount: 1500000000000000000n,
      quotedCashOutCount: 1462500000000000000n,
      grossReclaimAmount: 1000000n,
      netReclaimAmount: 975000n,
      terminal: POSITION.terminalAddress,
      accountingContext: POSITION.baseTokenContext,
    };
    usePublicClientMock.mockReturnValue(publicClient);
    useQueryMock.mockReturnValue({ data: quote });
    quoteRevnetCashOutMock.mockResolvedValue(quote);

    render(
      <CashOutDialog position={POSITION}>
        <button type="button">Open</button>
      </CashOutDialog>
    );

    fireEvent.change(screen.getByPlaceholderText("0.0"), {
      target: { value: "1.5" },
    });

    const call = useQueryMock.mock.calls.at(-1)?.[0];
    expect(call?.enabled).toBe(true);
    await expect(call?.queryFn()).resolves.toEqual(quote);
    expect(quoteRevnetCashOutMock).toHaveBeenCalledWith(publicClient, {
      projectId: 138n,
      rawCashOutCount: 1500000000000000000n,
      terminal: POSITION.terminalAddress,
      accountingContext: POSITION.baseTokenContext,
    });
  });

  it("invalidates REVNET queries after a successful cash out", () => {
    usePublicClientMock.mockReturnValue({ readContract: vi.fn() });
    useQueryMock.mockReturnValue({ data: null });

    render(
      <CashOutDialog position={POSITION}>
        <button type="button">Open</button>
      </CashOutDialog>
    );

    const txOptions = useContractTransactionMock.mock.calls[0]?.[0];
    txOptions?.onSuccess?.("0xhash");

    expect(routerRefreshMock).toHaveBeenCalled();
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [REVNET_POSITION_QUERY_KEY],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [REVNET_CASH_OUT_QUOTE_QUERY_KEY],
    });
  });
});
