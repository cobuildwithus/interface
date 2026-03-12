import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RevnetPosition } from "./types";

const buildRevnetBorrowPlanMock = vi.hoisted(() => vi.fn());
const toastMock = vi.hoisted(() => ({
  dismiss: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@cobuild/wire", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@cobuild/wire")>();
  return {
    ...actual,
    buildRevnetBorrowPlan: (...args: Parameters<typeof buildRevnetBorrowPlanMock>) =>
      buildRevnetBorrowPlanMock(...args),
    jbPermissionsRevnetAbi: [],
  };
});

vi.mock("sonner", () => ({ toast: toastMock }));

import { createBorrowHandler } from "./borrow-handler";

type BorrowHandlerArgs = Parameters<typeof createBorrowHandler>[0];
type ContractTx = BorrowHandlerArgs["borrowTx"];

function address(char: string): `0x${string}` {
  return ("0x" + char.repeat(40)) as `0x${string}`;
}

const POSITION: RevnetPosition = {
  projectId: 138n,
  projectIdNumber: 138,
  tokenAddress: address("1"),
  tokenSymbol: "REV",
  tokenDecimals: 18,
  tokenBalance: 10n * 10n ** 18n,
  formattedBalance: "10",
  baseTokenContext: {
    token: address("2"),
    decimals: 6,
    currency: 1,
  },
  baseTokenAddress: address("2"),
  baseTokenSymbol: "USDC",
  terminalAddress: address("3"),
  permissionsAddress: address("4"),
  revLoansAddress: address("5"),
  cashOutValue: 0n,
  formattedCashOutValue: "0",
  isConnected: true,
  account: address("a"),
};

const BORROW_PLAN = {
  steps: [
    {
      key: "permission",
      intent: { address: POSITION.permissionsAddress, abi: [], functionName: "setPermissions" },
    },
    {
      key: "borrow",
      intent: { address: POSITION.revLoansAddress, abi: [], functionName: "borrowFrom" },
    },
  ],
};

const BORROW_ONLY_PLAN = {
  steps: [BORROW_PLAN.steps[1]],
};

function createTx(overrides: Partial<ContractTx> = {}): ContractTx {
  return {
    isLoading: false,
    markErrorHandled: vi.fn(),
    prepareWallet: vi.fn().mockResolvedValue(undefined),
    writeContractAsync: vi.fn(),
    ...overrides,
  };
}

function createArgs(overrides: Partial<BorrowHandlerArgs> = {}): BorrowHandlerArgs {
  return {
    position: POSITION,
    revLoansAddress: POSITION.revLoansAddress,
    permissionsAddress: POSITION.permissionsAddress,
    loanSourceToken: address("6"),
    loanSourceTerminal: address("7"),
    collateralCount: 1n,
    prepaidFeePercent: 500,
    isCollateralValid: true,
    needsPermission: true,
    borrowTx: createTx(),
    permissionTx: createTx(),
    publicClient: null,
    refetchPermission: vi.fn(),
    setIsSubmitting: vi.fn(),
    setSubmitStep: vi.fn(),
    ...overrides,
  };
}

describe("createBorrowHandler", () => {
  beforeEach(() => {
    buildRevnetBorrowPlanMock.mockReset();
    toastMock.dismiss.mockReset();
    toastMock.error.mockReset();
    vi.useRealTimers();
  });

  it("surfaces a borrow failure after permission confirmation without hiding the permission step", async () => {
    vi.useFakeTimers();
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
      writeContractAsync: vi.fn().mockRejectedValue(new Error("Borrow reverted")),
    });
    const permissionTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("permission-toast"),
      writeContractAsync: vi.fn().mockResolvedValue("0xpermission-hash"),
    });
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(false),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    } as NonNullable<BorrowHandlerArgs["publicClient"]>;
    const setIsSubmitting = vi.fn();
    const setSubmitStep = vi.fn();
    const refetchPermission = vi.fn();

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        permissionTx,
        publicClient,
        setIsSubmitting,
        setSubmitStep,
        refetchPermission,
      })
    );

    const borrowPromise = handleBorrow();
    await vi.runAllTimersAsync();
    await borrowPromise;

    expect(publicClient.readContract).toHaveBeenCalledTimes(1);
    expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: "0xpermission-hash",
    });
    expect(refetchPermission).toHaveBeenCalledTimes(1);
    expect(permissionTx.prepareWallet).toHaveBeenCalledTimes(1);
    expect(permissionTx.writeContractAsync).toHaveBeenCalledTimes(1);
    expect(borrowTx.prepareWallet).toHaveBeenCalledTimes(1);
    expect(borrowTx.writeContractAsync).toHaveBeenCalledTimes(1);
    expect(toastMock.error).toHaveBeenCalledWith(
      "Permission granted, but creating the loan failed: Borrow reverted",
      {
        id: "borrow-toast",
        duration: 3000,
      }
    );
    expect(toastMock.dismiss).not.toHaveBeenCalledWith("permission-toast");
    expect(setIsSubmitting.mock.calls).toEqual([[true], [false]]);
    expect(setSubmitStep.mock.calls).toEqual([["permission"], ["loan"], [null]]);
  });

  it("surfaces permission-step failures before any borrow toast is prepared", async () => {
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
    });
    const permissionTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("permission-toast"),
      writeContractAsync: vi.fn().mockRejectedValue(new Error("Permission reverted")),
    });
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(false),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    } as NonNullable<BorrowHandlerArgs["publicClient"]>;
    const setIsSubmitting = vi.fn();
    const setSubmitStep = vi.fn();
    const refetchPermission = vi.fn();

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        permissionTx,
        publicClient,
        setIsSubmitting,
        setSubmitStep,
        refetchPermission,
      })
    );

    await handleBorrow();

    expect(permissionTx.prepareWallet).toHaveBeenCalledTimes(1);
    expect(permissionTx.writeContractAsync).toHaveBeenCalledTimes(1);
    expect(borrowTx.prepareWallet).not.toHaveBeenCalled();
    expect(borrowTx.writeContractAsync).not.toHaveBeenCalled();
    expect(refetchPermission).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith("Permission reverted", {
      id: "permission-toast",
      duration: 3000,
    });
    expect(setIsSubmitting.mock.calls).toEqual([[true], [false]]);
    expect(setSubmitStep.mock.calls).toEqual([["permission"], [null]]);
  });

  it("dismisses only the borrow toast when the borrow step is rejected after confirmed permission", async () => {
    vi.useFakeTimers();
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
      writeContractAsync: vi.fn().mockRejectedValue(new Error("User rejected the request")),
    });
    const permissionTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("permission-toast"),
      writeContractAsync: vi.fn().mockResolvedValue("0xpermission-hash"),
    });
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(false),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "success" }),
    } as NonNullable<BorrowHandlerArgs["publicClient"]>;
    const setIsSubmitting = vi.fn();
    const setSubmitStep = vi.fn();

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        permissionTx,
        publicClient,
        setIsSubmitting,
        setSubmitStep,
      })
    );

    const borrowPromise = handleBorrow();
    await vi.runAllTimersAsync();
    await borrowPromise;

    expect(toastMock.dismiss).toHaveBeenCalledWith("borrow-toast");
    expect(toastMock.dismiss).not.toHaveBeenCalledWith("permission-toast");
    expect(toastMock.error).not.toHaveBeenCalled();
    expect(setIsSubmitting.mock.calls).toEqual([[true], [false]]);
    expect(setSubmitStep.mock.calls).toEqual([["permission"], ["loan"], [null]]);
  });

  it("treats provider-prefixed rejection messages as user rejections", async () => {
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_ONLY_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
      writeContractAsync: vi.fn().mockRejectedValue({
        message: "MetaMask Tx Signature: User denied transaction signature",
      }),
    });

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        needsPermission: false,
      })
    );

    await handleBorrow();

    expect(toastMock.dismiss).toHaveBeenCalledWith("borrow-toast");
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("surfaces permission confirmation failures on the permission step before borrow starts", async () => {
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
    });
    const permissionTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("permission-toast"),
      writeContractAsync: vi.fn().mockResolvedValue("0xpermission-hash"),
    });
    const publicClient = {
      readContract: vi.fn().mockResolvedValue(false),
      waitForTransactionReceipt: vi.fn().mockResolvedValue({ status: "reverted" }),
    } as NonNullable<BorrowHandlerArgs["publicClient"]>;
    const refetchPermission = vi.fn();
    const setIsSubmitting = vi.fn();
    const setSubmitStep = vi.fn();

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        permissionTx,
        publicClient,
        refetchPermission,
        setIsSubmitting,
        setSubmitStep,
      })
    );

    await handleBorrow();

    expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: "0xpermission-hash",
    });
    expect(refetchPermission).not.toHaveBeenCalled();
    expect(borrowTx.prepareWallet).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith("Permission transaction reverted.", {
      id: "permission-toast",
      duration: 3000,
    });
    expect(setIsSubmitting.mock.calls).toEqual([[true], [false]]);
    expect(setSubmitStep.mock.calls).toEqual([["permission"], [null]]);
  });

  it("keeps the permission step visible when borrow fails before permission confirmation", async () => {
    vi.useFakeTimers();
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
      writeContractAsync: vi.fn().mockRejectedValue(new Error("Borrow reverted")),
    });
    const permissionTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("permission-toast"),
      writeContractAsync: vi.fn().mockResolvedValue("0xpermission-hash"),
    });
    const refetchPermission = vi.fn();

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        permissionTx,
        publicClient: null,
        refetchPermission,
      })
    );

    const borrowPromise = handleBorrow();
    await vi.runAllTimersAsync();
    await borrowPromise;

    expect(refetchPermission).toHaveBeenCalledTimes(1);
    expect(toastMock.error).toHaveBeenCalledWith(
      "Permission transaction submitted, but creating the loan failed: Borrow reverted",
      {
        id: "borrow-toast",
        duration: 3000,
      }
    );
    expect(toastMock.dismiss).not.toHaveBeenCalledWith("permission-toast");
  });

  it("prefers shortMessage when available for user-visible failures", async () => {
    buildRevnetBorrowPlanMock.mockReturnValue(BORROW_ONLY_PLAN);

    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
      writeContractAsync: vi.fn().mockRejectedValue({
        message: "Full failure details",
        shortMessage: "Short failure",
      }),
    });

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        needsPermission: false,
      })
    );

    await handleBorrow();

    expect(toastMock.error).toHaveBeenCalledWith("Short failure", {
      id: "borrow-toast",
      duration: 3000,
    });
  });

  it("shows direct validation errors before any transaction toast is prepared", async () => {
    const borrowTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("borrow-toast"),
    });
    const permissionTx = createTx({
      prepareWallet: vi.fn().mockResolvedValue("permission-toast"),
    });

    const handleBorrow = createBorrowHandler(
      createArgs({
        borrowTx,
        permissionTx,
        isCollateralValid: false,
      })
    );

    await handleBorrow();

    expect(borrowTx.prepareWallet).not.toHaveBeenCalled();
    expect(permissionTx.prepareWallet).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith("Invalid collateral amount", {
      duration: 3000,
    });
  });
});
