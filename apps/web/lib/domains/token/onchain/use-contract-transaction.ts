"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type Hex } from "viem";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
  type BaseError,
} from "wagmi";
import { baseBuilderCodeDataSuffixForChainId } from "@cobuild/wire";
import { useLogin } from "@/lib/domains/auth/use-login";
import { chains } from "@/lib/domains/token/onchain/wagmi-config";

type ChainId = (typeof chains)[number]["id"];

type WriteContractFn = NonNullable<ReturnType<typeof useWriteContract>["writeContract"]>;
type WriteContractAsyncFn = NonNullable<ReturnType<typeof useWriteContract>["writeContractAsync"]>;

function normalizeTransactionErrorMessage(error: BaseError | Error) {
  const message = (error as BaseError).shortMessage || error.message;
  return message.replace(/^User /, "You ");
}

function isUserRejectionMessage(message: string) {
  const lowerMessage = message.toLowerCase();
  return (
    lowerMessage.includes("user rejected") ||
    lowerMessage.includes("user denied") ||
    lowerMessage.includes("you rejected") ||
    lowerMessage.includes("you denied")
  );
}

function withBuilderCodeDataSuffix<T extends { dataSuffix?: Hex }>(
  variables: T,
  suffix: Hex | undefined
): T {
  if (!suffix || variables.dataSuffix) {
    return variables;
  }
  return {
    ...variables,
    dataSuffix: suffix,
  };
}

function explorerUrl(hash: string, chainId: number) {
  const explorerDomain: Record<number, string> = {
    1: "etherscan.io",
    8453: "basescan.org",
    84532: "sepolia.basescan.org",
    10: "optimistic.etherscan.io",
    42161: "arbiscan.io",
  };

  const domain = explorerDomain[chainId] || "basescan.org";
  return `https://${domain}/tx/${hash}`;
}

export const useContractTransaction = (args: {
  chainId: ChainId;
  onSuccess?: (hash: string) => void;
  refreshOnSuccess?: boolean;
  loading?: string;
  success?: string;
  defaultToastId?: string;
}) => {
  const router = useRouter();
  const {
    chainId,
    loading = "Transaction in progress…",
    success,
    onSuccess,
    refreshOnSuccess = false,
    defaultToastId,
  } = args;
  const [toastId, setToastId] = useState<number | string>(defaultToastId || "");
  const [callbackHandled, setCallbackHandled] = useState(false);
  const {
    data: hash,
    isPending,
    error,
    writeContract,
    writeContractAsync,
    ...writeContractRest
  } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });
  const dataSuffix = baseBuilderCodeDataSuffixForChainId(chainId);

  const { chainId: connectedChainId, isConnected, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { login, connectWallet } = useLogin();

  const writeContractWithBuilderCode: WriteContractFn = (variables, options) => {
    if (!writeContract) {
      throw new Error("writeContract is unavailable");
    }
    const variablesWithBuilderCode = withBuilderCodeDataSuffix(
      variables as { dataSuffix?: Hex },
      dataSuffix
    );
    return (writeContract as (...args: unknown[]) => ReturnType<WriteContractFn>)(
      variablesWithBuilderCode as Parameters<WriteContractFn>[0],
      options
    );
  };

  const writeContractAsyncWithBuilderCode: WriteContractAsyncFn = (variables, options) => {
    if (!writeContractAsync) {
      throw new Error("writeContractAsync is unavailable");
    }
    const variablesWithBuilderCode = withBuilderCodeDataSuffix(
      variables as { dataSuffix?: Hex },
      dataSuffix
    );
    return (writeContractAsync as (...args: unknown[]) => ReturnType<WriteContractAsyncFn>)(
      variablesWithBuilderCode as Parameters<WriteContractAsyncFn>[0],
      options
    );
  };

  useEffect(() => {
    if (callbackHandled || !toastId) return;

    if (isLoading && hash) {
      toast.loading(loading, {
        description: "",
        action: {
          label: "View",
          onClick: () => window.open(explorerUrl(hash, chainId)),
        },
        id: toastId,
      });
      return;
    }

    if (error) {
      const message = normalizeTransactionErrorMessage(error as BaseError | Error);

      if (isUserRejectionMessage(message)) {
        toast.dismiss(toastId);
      } else {
        console.error(error);
        toast.error(message, {
          id: toastId,
          duration: 3000,
        });
      }
      setCallbackHandled(true);
      return;
    }

    if (isSuccess && hash) {
      toast.success(success || "Transaction confirmed", {
        id: toastId,
        duration: 3000,
      });
      onSuccess?.(hash);
      if (refreshOnSuccess) {
        router.refresh();
      }
      setCallbackHandled(true);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chainId,
    error,
    hash,
    isLoading,
    isSuccess,
    loading,
    onSuccess,
    refreshOnSuccess,
    router,
    success,
    toastId,
  ]);

  return {
    isPending,
    isConfirming: isLoading,
    isConfirmed: isSuccess,
    isLoading: isLoading || isPending,
    hash,
    error,
    markErrorHandled: () => setCallbackHandled(true),
    account: address,
    prepareWallet: async (customToastId?: number | string) => {
      setCallbackHandled(false);

      if (!isConnected) {
        connectWallet();
        return undefined;
      }
      if (!address) {
        login();
        return undefined;
      }

      if (chainId !== connectedChainId) {
        try {
          await switchChainAsync({ chainId });
        } catch {
          toast.error(`Please switch to chain ${chainId}`);
          return undefined;
        }
      }

      const idToUse = customToastId || toastId || undefined;
      const newToastId = toast.loading(loading, { id: idToUse, action: null });
      setToastId(newToastId);
      return newToastId;
    },
    toastId,
    writeContract: writeContractWithBuilderCode,
    writeContractAsync: writeContractAsyncWithBuilderCode,
    ...writeContractRest,
  };
};
