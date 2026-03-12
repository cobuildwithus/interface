import { decodeGoalDeployedEvent } from "@cobuild/wire";
import { isAddress } from "viem";
import type { CreateGoalDeploymentState } from "./types";

type GoalReceiptLogs = Parameters<typeof decodeGoalDeployedEvent>[0];

export function extractCreateGoalDeploymentState(
  txHash: string,
  logs: GoalReceiptLogs
): CreateGoalDeploymentState {
  const deploymentEvent = decodeGoalDeployedEvent(logs);
  const stack = deploymentEvent?.stack;

  return {
    txHash,
    goalTreasury:
      typeof stack?.goalTreasury === "string" && isAddress(stack.goalTreasury)
        ? stack.goalTreasury.toLowerCase()
        : undefined,
    goalFlow:
      typeof stack?.goalFlow === "string" && isAddress(stack.goalFlow)
        ? stack.goalFlow.toLowerCase()
        : undefined,
    goalRevnetId:
      typeof stack?.goalRevnetId === "bigint" ? stack.goalRevnetId.toString(10) : undefined,
  };
}
