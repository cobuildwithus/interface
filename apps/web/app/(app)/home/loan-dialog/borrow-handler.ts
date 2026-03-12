import { buildRevnetBorrowPlan, jbPermissionsRevnetAbi } from "@cobuild/wire";
import { toast } from "sonner";
import type { usePublicClient } from "wagmi";
import { REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";
import type { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";
import type { RevnetPosition } from "./types";

type ContractTx = Pick<
  ReturnType<typeof useContractTransaction>,
  "prepareWallet" | "writeContractAsync" | "isLoading" | "markErrorHandled"
>;

type PublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

type BorrowHandlerInput = {
  position: RevnetPosition;
  revLoansAddress: `0x${string}`;
  permissionsAddress: `0x${string}`;
  loanSourceToken?: string;
  loanSourceTerminal?: string;
  collateralCount: bigint;
  prepaidFeePercent: number;
  isCollateralValid: boolean;
  needsPermission: boolean;
  borrowTx: ContractTx;
  permissionTx: ContractTx;
  publicClient: PublicClient | null;
  refetchPermission?: () => void;
  setIsSubmitting: (value: boolean) => void;
  setSubmitStep: (value: "permission" | "loan" | null) => void;
};

type PermissionProgress = "not-started" | "submitted" | "confirmed";
type BorrowStep = "permission" | "borrow" | null;

function normalizeBorrowFlowError(error: unknown) {
  if (error && typeof error === "object") {
    const shortMessage =
      "shortMessage" in error && typeof error.shortMessage === "string"
        ? error.shortMessage.trim()
        : "";
    if (shortMessage.length > 0) {
      return shortMessage.replace(/^User /, "You ");
    }
    const message = "message" in error && typeof error.message === "string" ? error.message : "";
    if (message.trim().length > 0) {
      return message.replace(/^User /, "You ");
    }
  }
  return "Failed to create loan.";
}

function isUserRejectionError(message: string) {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes("user rejected") ||
    lowerMessage.includes("user denied") ||
    lowerMessage.includes("you rejected") ||
    lowerMessage.includes("you denied")
  );
}

function buildBorrowFlowFailureMessage(
  message: string,
  activeStep: BorrowStep,
  permissionProgress: PermissionProgress
) {
  if (activeStep !== "borrow") {
    return message;
  }
  if (permissionProgress === "confirmed") {
    return `Permission granted, but creating the loan failed: ${message}`;
  }
  if (permissionProgress === "submitted") {
    return `Permission transaction submitted, but creating the loan failed: ${message}`;
  }
  return message;
}

export const createBorrowHandler =
  ({
    position,
    revLoansAddress,
    permissionsAddress,
    loanSourceToken,
    loanSourceTerminal,
    collateralCount,
    prepaidFeePercent,
    isCollateralValid,
    needsPermission,
    borrowTx,
    permissionTx,
    publicClient,
    refetchPermission,
    setIsSubmitting,
    setSubmitStep,
  }: BorrowHandlerInput) =>
  async () => {
    type PermissionWriteRequest = Parameters<typeof permissionTx.writeContractAsync>[0];
    type BorrowWriteRequest = Parameters<typeof borrowTx.writeContractAsync>[0];
    setIsSubmitting(true);
    let borrowToastId: string | number | undefined;
    let permissionToastId: string | number | undefined;
    let permissionProgress: PermissionProgress = "not-started";
    let activeStep: BorrowStep = null;
    try {
      if (!position.account) {
        throw new Error("Wallet not connected");
      }

      if (!loanSourceToken || !loanSourceTerminal) {
        throw new Error("Loan not available for this project");
      }

      if (!isCollateralValid) {
        throw new Error("Invalid collateral amount");
      }

      let requiresPermission = needsPermission;
      if (publicClient && position.account) {
        try {
          const livePermission = await publicClient.readContract({
            address: permissionsAddress,
            abi: jbPermissionsRevnetAbi,
            functionName: "hasPermission",
            args: [revLoansAddress, position.account, position.projectId, 1n, true, true],
          });
          requiresPermission = livePermission !== true;
        } catch {
          requiresPermission = needsPermission;
        }
      }

      const plan = buildRevnetBorrowPlan({
        account: position.account,
        projectId: position.projectId,
        source: {
          token: loanSourceToken as `0x${string}`,
          terminal: loanSourceTerminal as `0x${string}`,
        },
        collateralCount,
        prepaidFeePercent: BigInt(prepaidFeePercent),
        needsPermission: requiresPermission,
        permissionsAddress,
        revLoansAddress,
      });

      for (const step of plan.steps) {
        activeStep = step.key;
        setSubmitStep(step.key === "borrow" ? "loan" : step.key);
        if (step.key === "permission") {
          permissionToastId = await permissionTx.prepareWallet();
          const permissionHash = await permissionTx.writeContractAsync({
            ...(step.intent as PermissionWriteRequest),
            chainId: REVNET_CHAIN_ID,
          } as PermissionWriteRequest);
          permissionProgress = "submitted";

          if (permissionHash && publicClient) {
            const permissionReceipt = await publicClient.waitForTransactionReceipt({
              hash: permissionHash,
            });
            if (permissionReceipt.status !== "success") {
              throw new Error("Permission transaction reverted.");
            }
            permissionProgress = "confirmed";
          }

          refetchPermission?.();
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }

        borrowToastId = await borrowTx.prepareWallet();
        await borrowTx.writeContractAsync({
          ...(step.intent as BorrowWriteRequest),
          chainId: REVNET_CHAIN_ID,
        } as BorrowWriteRequest);
      }
    } catch (error) {
      const targetToastId =
        activeStep === "permission"
          ? permissionToastId
          : activeStep === "borrow"
            ? borrowToastId
            : undefined;
      const activeTx =
        activeStep === "permission" ? permissionTx : activeStep === "borrow" ? borrowTx : null;
      const normalizedError = normalizeBorrowFlowError(error);
      const failureMessage = buildBorrowFlowFailureMessage(
        normalizedError,
        activeStep,
        permissionProgress
      );

      activeTx?.markErrorHandled();
      if (isUserRejectionError(normalizedError)) {
        if (targetToastId) {
          toast.dismiss(targetToastId);
        }
      } else if (targetToastId) {
        toast.error(failureMessage, {
          id: targetToastId,
          duration: 3000,
        });
      } else {
        toast.error(failureMessage, {
          duration: 3000,
        });
      }
    } finally {
      setIsSubmitting(false);
      setSubmitStep(null);
    }
  };
