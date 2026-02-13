import type { AgentActivity, AgentAllocation, SGSummary } from "./types";

export const goalTitle = "Raise $1M for Cobuild by June 30, 2026";

export const systemStats = {
  totalFunding: 84250,
  dailyFlow: 320,
  rewardsLocked: 4200,
};

export const userStats = {
  staked: 2500,
  projectedReward: 95,
};

export const agentAllocations: AgentAllocation[] = [
  {
    sgId: "2",
    sgTitle: "25 verified testimonials by Mar 31, 2026",
    stakeAmount: 900,
    stakePercent: 36,
    status: "active",
    daysStaked: 21,
    rewardsEarned: 28,
    progressCurrent: 12,
    progressTarget: 25,
    progressUnit: "testimonials",
  },
  {
    sgId: "4",
    sgTitle: "50k qualified views by Apr 30, 2026",
    stakeAmount: 700,
    stakePercent: 28,
    status: "active",
    daysStaked: 18,
    rewardsEarned: 19,
    progressCurrent: 32000,
    progressTarget: 50000,
    progressUnit: "views",
  },
  {
    sgId: "5",
    sgTitle: "Mint flow error rate <2% by Apr 15, 2026",
    stakeAmount: 550,
    stakePercent: 22,
    status: "active",
    daysStaked: 14,
    rewardsEarned: 14,
    progressCurrent: 3.2,
    progressTarget: 2,
    progressUnit: "% error rate",
  },
  {
    sgId: "1",
    sgTitle: "Legal review complete by Feb 28, 2026",
    stakeAmount: 350,
    stakePercent: 14,
    status: "complete",
    daysStaked: 30,
    rewardsEarned: 34,
    progressCurrent: 1,
    progressTarget: 1,
    progressUnit: "review",
  },
];

export const recentActivity: AgentActivity[] = [
  {
    id: "1",
    action: "Added",
    sgTitle: "50k qualified views by Apr 30, 2026",
    amount: 120,
    reason: "Reach is the current bottleneck — increasing stake",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isPositive: true,
  },
  {
    id: "2",
    action: "Reduced",
    sgTitle: "Legal review complete by Feb 28, 2026",
    amount: 80,
    reason: "Review complete — reallocating to active subgoals",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    isPositive: false,
  },
  {
    id: "3",
    action: "Added",
    sgTitle: "6% mint completion rate by May 31, 2026",
    amount: 160,
    reason: "Mint drop-off detected — funding UX improvements",
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
    isPositive: true,
  },
];

export const initialSubGoals: SGSummary[] = [
  {
    id: "1",
    title: "Legal review complete by Feb 28, 2026",
    status: "complete",
    currentFunding: 15000,
    flowRate: 0,
    maxBudget: 15000,
  },
  {
    id: "2",
    title: "25 verified testimonials by Mar 31, 2026",
    status: "active",
    currentFunding: 22000,
    flowRate: 0.45,
    minBudget: 12000,
    maxBudget: 30000,
  },
  {
    id: "3",
    title: "Mint flow error rate <2% by Apr 15, 2026",
    status: "active",
    currentFunding: 13000,
    flowRate: 0.5,
    minBudget: 9000,
    maxBudget: 24000,
  },
  {
    id: "4",
    title: "50k qualified views by Apr 30, 2026",
    status: "active",
    currentFunding: 18000,
    flowRate: 0.6,
    minBudget: 15000,
    maxBudget: 35000,
  },
  {
    id: "5",
    title: "6% mint completion rate by May 31, 2026",
    status: "needsStake",
    currentFunding: 4000,
    flowRate: 0,
    minBudget: 8000,
    maxBudget: 20000,
  },
  {
    id: "6",
    title: "20 partner amplifications by Jun 15, 2026",
    status: "needsStake",
    currentFunding: 1500,
    flowRate: 0,
    minBudget: 6000,
    maxBudget: 10000,
  },
  {
    id: "7",
    title: "Launch referral program by Jul 1, 2026",
    status: "draft",
    currentFunding: 0,
    flowRate: 0,
    minBudget: 5000,
    maxBudget: 12000,
  },
  {
    id: "8",
    title: "500 Discord members by Aug 15, 2026",
    status: "draft",
    currentFunding: 0,
    flowRate: 0,
    minBudget: 3000,
    maxBudget: 8000,
  },
];
