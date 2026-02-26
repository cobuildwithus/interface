export type AllocationStatus = "active" | "paused" | "complete";

export interface AgentAllocation {
  sgId: string;
  sgTitle: string;
  stakeAmount: number;
  stakePercent: number;
  status: AllocationStatus;
  daysStaked: number;
  rewardsEarned: number;
  progressCurrent: number;
  progressTarget: number;
  progressUnit: string;
}

export interface AgentActivity {
  id: string;
  action: string;
  sgTitle: string;
  amount: number;
  reason: string;
  timestamp: Date;
  isPositive: boolean;
}

export type SubGoalStatus = "active" | "complete" | "draft" | "needsStake";

export interface SGSummary {
  id: string;
  title: string;
  status: SubGoalStatus;
  currentFunding: number;
  flowRate: number;
  minBudget?: number;
  maxBudget?: number;
}

export type StatusKey = AllocationStatus | SubGoalStatus;

export type StatusConfig = {
  [K in StatusKey]: {
    label: string;
    color: string;
    bg: string;
  };
};
