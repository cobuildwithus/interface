/**
 * @vitest-environment happy-dom
 */
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerRefreshMock = vi.fn();
const invalidateQueriesMock = vi.fn();
const useReadContractMock = vi.fn();
const usePublicClientMock = vi.fn();
const useContractTransactionMock = vi.fn();
const createBorrowHandlerMock = vi.fn();
let permissionTxState: {
  isLoading: boolean;
  prepareWallet: ReturnType<typeof vi.fn>;
  writeContractAsync: ReturnType<typeof vi.fn>;
  markErrorHandled: ReturnType<typeof vi.fn>;
};
let borrowTxState: {
  isLoading: boolean;
  prepareWallet: ReturnType<typeof vi.fn>;
  writeContractAsync: ReturnType<typeof vi.fn>;
  markErrorHandled: ReturnType<typeof vi.fn>;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefreshMock }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: invalidateQueriesMock }),
}));

vi.mock("wagmi", () => ({
  useReadContract: (args: Parameters<typeof useReadContractMock>[0]) => useReadContractMock(args),
  usePublicClient: (args: Parameters<typeof usePublicClientMock>[0]) => usePublicClientMock(args),
}));

vi.mock("@/lib/domains/token/onchain/use-contract-transaction", () => ({
  useContractTransaction: (...args: unknown[]) => useContractTransactionMock(...args),
}));

vi.mock("./borrow-handler", () => ({
  createBorrowHandler: (...args: unknown[]) => createBorrowHandlerMock(...args),
}));

vi.mock("./loan-fee-queries", () => ({
  useLoanFeeParams: () => ({
    revPrepaidFeePercent: 0n,
    minPrepaidFeePercent: 0n,
    maxPrepaidFeePercent: 1000n,
  }),
}));

vi.mock("./loan-metrics", () => ({
  calculateLoanMetrics: () => ({
    borrowDisplay: "1",
    principalDisplay: "1",
    upfrontFeeDisplay: "0",
    maxRepayDisplay: "1",
    collateralDisplay: "1",
    repayWindowLabel: "1 year",
    prepaidPercentLabel: "0",
    revFeePercentLabel: "0",
    feeWindowNote: "note",
    hasFullPrepayCoverage: true,
  }),
}));

vi.mock("./loan-source", () => ({
  resolveLoanDialogLoanSource: () => ({
    selectedLoanSource: {
      token: ("0x" + "2".repeat(40)) as `0x${string}`,
      terminal: ("0x" + "5".repeat(40)) as `0x${string}`,
    },
    loanSourceToken: ("0x" + "2".repeat(40)) as `0x${string}`,
    loanSourceTerminal: ("0x" + "5".repeat(40)) as `0x${string}`,
  }),
  resolveLoanDialogBorrowableContext: () => ({
    token: ("0x" + "2".repeat(40)) as `0x${string}`,
    decimals: 6,
    currency: 1,
  }),
}));

import {
  REVNET_CASH_OUT_QUOTE_QUERY_KEY,
  REVNET_POSITION_QUERY_KEY,
} from "@/lib/hooks/use-revnet-position";
import { useLoanDialogState } from "./state";

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

describe("useLoanDialogState", () => {
  beforeEach(() => {
    routerRefreshMock.mockReset();
    invalidateQueriesMock.mockReset();
    useReadContractMock.mockReset();
    usePublicClientMock.mockReset();
    useContractTransactionMock.mockReset();
    createBorrowHandlerMock.mockReset();
    permissionTxState = {
      isLoading: false,
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
      markErrorHandled: vi.fn(),
    };
    borrowTxState = {
      isLoading: false,
      prepareWallet: vi.fn(),
      writeContractAsync: vi.fn(),
      markErrorHandled: vi.fn(),
    };

    useReadContractMock.mockImplementation(
      (args: { functionName?: string; query?: { enabled?: boolean } }) => {
        switch (args.functionName) {
          case "loanSourcesOf":
            return {
              data: [{ token: address("2"), terminal: address("5") }],
            };
          case "symbol":
            return { data: "USDC" };
          case "accountingContextForTokenOf":
            return {
              data: {
                token: address("2"),
                decimals: 6,
                currency: 1,
              },
            };
          case "borrowableAmountFrom":
            return { data: 1_000_000n };
          case "hasPermission":
            return { data: true, refetch: vi.fn() };
          default:
            return { data: undefined, query: args.query };
        }
      }
    );
    usePublicClientMock.mockReturnValue({ readContract: vi.fn() });
    useContractTransactionMock.mockImplementation((args: { success?: string }) =>
      args.success === "Permission granted" ? permissionTxState : borrowTxState
    );
    createBorrowHandlerMock.mockReturnValue(vi.fn());
  });

  it("invalidates REVNET queries after a successful borrow", () => {
    renderHook(() => useLoanDialogState(POSITION));

    const borrowTxOptions = useContractTransactionMock.mock.calls.find(
      ([args]) => args?.success === "Loan created"
    )?.[0];

    borrowTxOptions?.onSuccess?.("0xhash");

    expect(routerRefreshMock).toHaveBeenCalled();
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [REVNET_POSITION_QUERY_KEY],
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: [REVNET_CASH_OUT_QUOTE_QUERY_KEY],
    });
  });

  it("keeps the permission step visible while permission is still pending after a borrow failure", () => {
    useReadContractMock.mockImplementation(
      (args: { functionName?: string; query?: { enabled?: boolean } }) => {
        switch (args.functionName) {
          case "loanSourcesOf":
            return {
              data: [{ token: address("2"), terminal: address("5") }],
            };
          case "symbol":
            return { data: "USDC" };
          case "accountingContextForTokenOf":
            return {
              data: {
                token: address("2"),
                decimals: 6,
                currency: 1,
              },
            };
          case "borrowableAmountFrom":
            return { data: 1_000_000n };
          case "hasPermission":
            return { data: false, refetch: vi.fn() };
          default:
            return { data: undefined, query: args.query };
        }
      }
    );
    permissionTxState.isLoading = true;

    const { result } = renderHook(() => useLoanDialogState(POSITION));

    expect(result.current.isProcessing).toBe(true);
    expect(result.current.buttonLabel).toBe("Granting permission...");
  });
});
