import { toast } from "sonner";
import type { usePublicClient } from "wagmi";
import { jbPermissionsAbi, revLoansAbi } from "@/lib/domains/token/onchain/abis";
import { REVNET_CHAIN_ID } from "@/lib/domains/token/onchain/revnet";
import type { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";
import type { RevnetPosition } from "./types";

type ContractTx = Pick<
  ReturnType<typeof useContractTransaction>,
  "prepareWallet" | "writeContractAsync" | "isLoading"
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
    setIsSubmitting(true);
    let borrowToastId: string | number | undefined;
    let permissionToastId: string | number | undefined;
    try {
      borrowToastId = await borrowTx.prepareWallet();

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
            abi: jbPermissionsAbi,
            functionName: "hasPermission",
            args: [revLoansAddress, position.account, position.projectId, 1n, true, true],
          });
          requiresPermission = livePermission !== true;
        } catch {
          requiresPermission = needsPermission;
        }
      }

      setSubmitStep(requiresPermission ? "permission" : "loan");

      if (requiresPermission) {
        permissionToastId = await permissionTx.prepareWallet();
        const permissionHash = await permissionTx.writeContractAsync({
          address: permissionsAddress,
          abi: jbPermissionsAbi,
          functionName: "setPermissionsFor",
          args: [
            position.account,
            {
              operator: revLoansAddress,
              projectId: position.projectId,
              permissionIds: [1],
            },
          ],
          chainId: REVNET_CHAIN_ID,
        });

        if (permissionHash && publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: permissionHash });
        }

        refetchPermission?.();
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSubmitStep("loan");
      }

      await borrowTx.writeContractAsync({
        address: revLoansAddress,
        abi: revLoansAbi,
        functionName: "borrowFrom",
        args: [
          position.projectId,
          {
            token: loanSourceToken as `0x${string}`,
            terminal: loanSourceTerminal as `0x${string}`,
          },
          0n,
          collateralCount,
          position.account,
          BigInt(prepaidFeePercent),
        ],
        chainId: REVNET_CHAIN_ID,
      });
    } catch {
      if (borrowToastId) toast.dismiss(borrowToastId);
      if (permissionToastId) toast.dismiss(permissionToastId);
    } finally {
      setIsSubmitting(false);
      setSubmitStep(null);
    }
  };
