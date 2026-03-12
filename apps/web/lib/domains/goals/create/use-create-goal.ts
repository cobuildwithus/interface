"use client";

import { buildGoalCreateTransaction, goalFactoryAbi, normalizeEvmAddress } from "@cobuild/wire";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Address, Hex } from "viem";
import { usePublicClient } from "wagmi";
import { BASE_CHAIN_ID } from "@/lib/domains/token/onchain/addresses";
import { useContractTransaction } from "@/lib/domains/token/onchain/use-contract-transaction";
import { ZERO_ADDRESS } from "./constants";
import { extractCreateGoalDeploymentState } from "./deployment";
import { parseCreateGoalForm } from "./parse-create-goal-form";
import { toDeployParams } from "./to-deploy-params";
import type { CreateGoalDeploymentState, CreateGoalFormState } from "./types";

export function useCreateGoal() {
  const router = useRouter();
  const publicClient = usePublicClient({ chainId: BASE_CHAIN_ID });
  const [formError, setFormError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<CreateGoalDeploymentState | null>(null);

  async function handleDeploymentConfirmed(hash: string) {
    if (!publicClient) {
      setDeployment({ txHash: hash });
      return;
    }

    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: hash as Hex });
      const nextDeployment = extractCreateGoalDeploymentState(hash, receipt.logs);
      setDeployment(nextDeployment);

      if (nextDeployment.goalTreasury) {
        router.push(`/${nextDeployment.goalTreasury}`);
      }
    } catch (error) {
      console.error(error);
      setDeployment({ txHash: hash });
    }
  }

  const { prepareWallet, writeContractAsync, account, isLoading } = useContractTransaction({
    chainId: BASE_CHAIN_ID,
    loading: "Deploying goal stack…",
    success: "Goal deployment confirmed",
    onSuccess: (hash) => {
      void handleDeploymentConfirmed(hash);
    },
  });

  async function createGoal(form: CreateGoalFormState) {
    setFormError(null);

    try {
      const parsedForm = parseCreateGoalForm(form);
      const preflightDeployParams = toDeployParams(ZERO_ADDRESS as Address, parsedForm);
      buildGoalCreateTransaction({
        deployParams: preflightDeployParams,
      });

      await prepareWallet();
      if (!account) return;

      const deployParams = toDeployParams(
        normalizeEvmAddress(account, "Allocation mechanism admin"),
        parsedForm
      );
      const goalCreateTx = buildGoalCreateTransaction({
        deployParams,
      });

      await writeContractAsync({
        address: goalCreateTx.to,
        abi: goalFactoryAbi,
        functionName: "deployGoal",
        args: [deployParams],
        chainId: BASE_CHAIN_ID,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Failed to deploy goal.");
    }
  }

  return {
    createGoal,
    deployment,
    formError,
    isLoading,
  };
}
