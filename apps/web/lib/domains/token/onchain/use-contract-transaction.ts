"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  useAccount,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
  type BaseError,
} from "wagmi";
import { useLogin } from "@/lib/domains/auth/use-login";
import { chains } from "@/lib/domains/token/onchain/wagmi-config";

type ChainId = (typeof chains)[number]["id"];

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
  loading?: string;
  success?: string;
  defaultToastId?: string;
}) => {
  const router = useRouter();
  const {
    chainId,
    loading = "Transaction in progress…",
    success,
    onSuccess = () => router.refresh(),
    defaultToastId,
  } = args;
  const [toastId, setToastId] = useState<number | string>(defaultToastId || "");
  const [callbackHandled, setCallbackHandled] = useState(false);
  const { data: hash, isPending, error, ...writeContractRest } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { chainId: connectedChainId, isConnected, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { login, connectWallet } = useLogin();

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
      const message = (error as BaseError).shortMessage || error.message;
      const isUserRejection =
        message.toLowerCase().includes("user rejected") ||
        message.toLowerCase().includes("user denied");

      if (isUserRejection) {
        toast.dismiss(toastId);
      } else {
        console.error(error);
        toast.error(message.replace("User ", "You "), {
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
      setCallbackHandled(true);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, error, isSuccess]);

  return {
    isPending,
    isConfirming: isLoading,
    isConfirmed: isSuccess,
    isLoading: isLoading || isPending,
    hash,
    error,
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
    ...writeContractRest,
  };
};
