import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  goalTreasuryFindUniqueMock,
  goalTreasuryFindFirstMock,
  goalTreasuryFindManyMock,
  juiceboxProjectFindUniqueMock,
  juiceboxProjectFindFirstMock,
  juiceboxProjectFindManyMock,
  juiceboxPayEventAggregateMock,
  juiceboxPayEventFindManyMock,
  juiceboxPayEventFindFirstMock,
  juiceboxPayEventGroupByMock,
  juiceboxActivityLogFindManyMock,
  flowRecipientFindManyMock,
  stakeVaultFindUniqueMock,
  hookFundingFindManyMock,
  goalTreasurySeriesFindManyMock,
  goalContributorAggregateFindManyMock,
  budgetTreasuryFindManyMock,
  stakePositionFindManyMock,
  premiumAccountAggregateMock,
  allocationCheckpointFindManyMock,
  juiceboxParticipantFindManyMock,
} = vi.hoisted(() => ({
  goalTreasuryFindUniqueMock: vi.fn(),
  goalTreasuryFindFirstMock: vi.fn(),
  goalTreasuryFindManyMock: vi.fn(),
  juiceboxProjectFindUniqueMock: vi.fn(),
  juiceboxProjectFindFirstMock: vi.fn(),
  juiceboxProjectFindManyMock: vi.fn(),
  juiceboxPayEventAggregateMock: vi.fn(),
  juiceboxPayEventFindManyMock: vi.fn(),
  juiceboxPayEventFindFirstMock: vi.fn(),
  juiceboxPayEventGroupByMock: vi.fn(),
  juiceboxActivityLogFindManyMock: vi.fn(),
  flowRecipientFindManyMock: vi.fn(),
  stakeVaultFindUniqueMock: vi.fn(),
  hookFundingFindManyMock: vi.fn(),
  goalTreasurySeriesFindManyMock: vi.fn(),
  goalContributorAggregateFindManyMock: vi.fn(),
  budgetTreasuryFindManyMock: vi.fn(),
  stakePositionFindManyMock: vi.fn(),
  premiumAccountAggregateMock: vi.fn(),
  allocationCheckpointFindManyMock: vi.fn(),
  juiceboxParticipantFindManyMock: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: <TArgs extends readonly unknown[], TReturn>(fn: (...args: TArgs) => TReturn) =>
    fn,
}));

vi.mock("@cobuild/wire", async () => {
  const actual = await vi.importActual<typeof import("@cobuild/wire")>("@cobuild/wire");
  return {
    ...actual,
    normalizeEvmAddress: (value: string) => value.toLowerCase(),
  };
});

vi.mock("@/lib/server/db/cobuild-db-client", () => ({
  default: {
    goalTreasury: {
      findUnique: (...args: Parameters<typeof goalTreasuryFindUniqueMock>) =>
        goalTreasuryFindUniqueMock(...args),
      findFirst: (...args: Parameters<typeof goalTreasuryFindFirstMock>) =>
        goalTreasuryFindFirstMock(...args),
      findMany: (...args: Parameters<typeof goalTreasuryFindManyMock>) =>
        goalTreasuryFindManyMock(...args),
    },
    juiceboxProject: {
      findUnique: (...args: Parameters<typeof juiceboxProjectFindUniqueMock>) =>
        juiceboxProjectFindUniqueMock(...args),
      findFirst: (...args: Parameters<typeof juiceboxProjectFindFirstMock>) =>
        juiceboxProjectFindFirstMock(...args),
      findMany: (...args: Parameters<typeof juiceboxProjectFindManyMock>) =>
        juiceboxProjectFindManyMock(...args),
    },
    juiceboxPayEvent: {
      aggregate: (...args: Parameters<typeof juiceboxPayEventAggregateMock>) =>
        juiceboxPayEventAggregateMock(...args),
      findMany: (...args: Parameters<typeof juiceboxPayEventFindManyMock>) =>
        juiceboxPayEventFindManyMock(...args),
      findFirst: (...args: Parameters<typeof juiceboxPayEventFindFirstMock>) =>
        juiceboxPayEventFindFirstMock(...args),
      groupBy: (...args: Parameters<typeof juiceboxPayEventGroupByMock>) =>
        juiceboxPayEventGroupByMock(...args),
    },
    juiceboxActivityLog: {
      findMany: (...args: Parameters<typeof juiceboxActivityLogFindManyMock>) =>
        juiceboxActivityLogFindManyMock(...args),
    },
    flowRecipient: {
      findMany: (...args: Parameters<typeof flowRecipientFindManyMock>) =>
        flowRecipientFindManyMock(...args),
    },
    stakeVault: {
      findUnique: (...args: Parameters<typeof stakeVaultFindUniqueMock>) =>
        stakeVaultFindUniqueMock(...args),
    },
    hookFunding: {
      findMany: (...args: Parameters<typeof hookFundingFindManyMock>) =>
        hookFundingFindManyMock(...args),
    },
    goalTreasurySeries: {
      findMany: (...args: Parameters<typeof goalTreasurySeriesFindManyMock>) =>
        goalTreasurySeriesFindManyMock(...args),
    },
    goalContributorAggregate: {
      findMany: (...args: Parameters<typeof goalContributorAggregateFindManyMock>) =>
        goalContributorAggregateFindManyMock(...args),
    },
    budgetTreasury: {
      findMany: (...args: Parameters<typeof budgetTreasuryFindManyMock>) =>
        budgetTreasuryFindManyMock(...args),
    },
    stakePosition: {
      findMany: (...args: Parameters<typeof stakePositionFindManyMock>) =>
        stakePositionFindManyMock(...args),
    },
    premiumAccount: {
      aggregate: (...args: Parameters<typeof premiumAccountAggregateMock>) =>
        premiumAccountAggregateMock(...args),
    },
    allocationCheckpoint: {
      findMany: (...args: Parameters<typeof allocationCheckpointFindManyMock>) =>
        allocationCheckpointFindManyMock(...args),
    },
    juiceboxParticipant: {
      findMany: (...args: Parameters<typeof juiceboxParticipantFindManyMock>) =>
        juiceboxParticipantFindManyMock(...args),
    },
  },
}));

import {
  getGoalAllocateData,
  getGoalBuildersData,
  getGoalCards,
  getGoalContributions,
  getGoalEvents,
  getGlobalGoalEvents,
  getGoalMilestones,
  getGoalOverviewData,
  getGoalTreasuryChartData,
  getResolvedGoal,
  getUserGoalHoldings,
} from "./goal-data";

const GOAL_ADDRESS = "0x1111111111111111111111111111111111111111";
const USER_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

beforeEach(() => {
  vi.clearAllMocks();

  goalTreasuryFindUniqueMock.mockResolvedValue({
    id: GOAL_ADDRESS,
    flowAddress: "flow-1",
    stakeVault: "vault-1",
    canonicalProjectChainId: 8453,
    canonicalProjectId: 42,
    canonicalRouteSlug: "build-better",
    canonicalRouteDomain: "co.build",
    goalRevnetId: 42,
    minRaise: 1_000_000_000_000,
    deadline: 1_800_000_000,
    createdAtTimestamp: 1_700_000_000,
    lastSyncedAppliedRate: 1_000_000,
    successAt: 1_800_100_000,
    finalized: true,
  });
  goalTreasuryFindFirstMock.mockResolvedValue(null);
  goalTreasuryFindManyMock.mockResolvedValue([
    {
      id: GOAL_ADDRESS,
      canonicalProjectChainId: 8453,
      canonicalProjectId: 42,
      canonicalRouteSlug: "build-better",
      minRaise: 1_000_000_000_000,
      createdAtTimestamp: 1_700_000_000,
      successAt: 1_800_100_000,
      finalized: true,
      deadline: 1_800_000_000,
    },
  ]);

  juiceboxProjectFindUniqueMock.mockResolvedValue({
    chainId: 8453,
    projectId: 42,
    name: "Build Better",
    description: "Goal description from DB",
    projectTagline: "Tagline",
    suckerGroupId: "group-1",
    accountingTokenSymbol: "USDC",
    accountingDecimals: 6,
    contributorsCount: 12,
    domain: "build-better",
  });
  juiceboxProjectFindFirstMock.mockResolvedValue(null);
  juiceboxProjectFindManyMock.mockResolvedValue([
    {
      chainId: 8453,
      projectId: 42,
      name: "Build Better",
      description: "Goal description from DB",
      projectTagline: "Tagline",
      suckerGroupId: "group-1",
      accountingTokenSymbol: "USDC",
      accountingDecimals: 6,
      contributorsCount: 12,
    },
  ]);

  juiceboxPayEventAggregateMock.mockResolvedValue({
    _sum: { amount: 500_000_000_000 },
  });
  juiceboxPayEventFindManyMock.mockResolvedValue([
    {
      txHash: "0xtx1",
      timestamp: 1_700_000_100,
      payer: "0xbbb",
      amount: 120_000_000,
    },
    {
      txHash: "0xtx2",
      timestamp: 1_700_000_460,
      payer: "0xccc",
      amount: 150_000_000,
    },
  ]);
  juiceboxPayEventFindFirstMock.mockResolvedValueOnce({
    txHash: "0xfirst",
    timestamp: 1_700_000_100,
    amount: 120_000_000,
  });
  juiceboxPayEventFindFirstMock.mockResolvedValueOnce({
    txHash: "0xlatest",
    timestamp: 1_700_009_100,
    amount: 250_000_000,
  });
  juiceboxPayEventGroupByMock.mockImplementation(async ({ by }: { by: string[] }) => {
    if (by.includes("suckerGroupId")) {
      return [
        {
          suckerGroupId: "group-1",
          _sum: { amount: 210_000_000 },
          _min: { timestamp: 1_700_000_100 },
        },
      ];
    }

    return [
      {
        chainId: 8453,
        projectId: 42,
        _sum: { amount: 500_000_000_000 },
        _min: { timestamp: 1_700_000_100 },
      },
    ];
  });

  juiceboxActivityLogFindManyMock.mockResolvedValue([
    {
      id: "evt-1",
      type: "pay",
      description: "Contribution received",
      memo: null,
      currency: "USDC",
      amount: "1000000",
      timestamp: 1_700_010_000,
      txHash: "0xevt1",
      suckerGroupId: "group-1",
    },
  ]);

  flowRecipientFindManyMock.mockResolvedValue([
    {
      id: "fr-1",
      recipientId: "sg-1",
      recipient: "0xsubgoal",
      budgetTreasury: "budget-1",
      title: "Ship v1 by Jun 2026",
      tagline: "Launch target",
      isRemoved: false,
      updatedAtTimestamp: 1_700_020_000,
    },
  ]);
  goalTreasurySeriesFindManyMock.mockResolvedValue([
    {
      timestamp: 1_700_000_100,
      balance: 120_000_000,
      inflow: 120_000_000,
      outflow: 0,
    },
    {
      timestamp: 1_700_000_460,
      balance: 90_000_000,
      inflow: 0,
      outflow: 30_000_000,
    },
  ]);
  goalContributorAggregateFindManyMock.mockResolvedValue([
    {
      goalTreasury: GOAL_ADDRESS,
      totalContributed: 210_000_000,
      firstContributedAt: 1_700_000_100,
    },
  ]);
  stakeVaultFindUniqueMock.mockResolvedValue({
    goalTotalStaked: 150_000_000,
    goalTotalWithdrawn: 20_000_000,
  });
  hookFundingFindManyMock.mockResolvedValue([
    {
      id: "hf-1",
      kind: "fund",
      amount: 2_000_000,
      sourceAmount: 2_000_000,
      superTokenAmount: 2_000_000,
      beneficiary: "0xsubgoal",
      timestamp: 1_700_030_000,
    },
  ]);
  budgetTreasuryFindManyMock.mockResolvedValue([
    {
      id: "budget-1",
      recipientId: "sg-1",
      state: 1,
      activationThreshold: 25_000_000,
      runwayCap: 200_000_000,
      lastSyncedAppliedRate: 100_000,
      lastSyncedTreasuryBalance: 80_000_000,
    },
  ]);
  stakePositionFindManyMock.mockResolvedValue([
    { staked: 75_000_000, withdrawn: 5_000_000, account: USER_ADDRESS },
  ]);
  premiumAccountAggregateMock.mockResolvedValue({
    _sum: { claimableAmount: 4_000_000 },
  });
  allocationCheckpointFindManyMock.mockResolvedValue([
    {
      id: "cp-1",
      account: USER_ADDRESS,
      budget: "budget-1",
      allocatedStake: 70_000_000,
      checkpointTimestamp: 1_700_000_000,
      txHash: "0xcp",
      blockNumber: 1,
      timestamp: 1_700_000_000,
    },
  ]);
  juiceboxParticipantFindManyMock.mockResolvedValue([
    { address: "0xfunder", balance: 3_200_000_000 },
  ]);
});

describe("goal-data", () => {
  it("resolves a goal and computes overview scope/progress", async () => {
    const resolved = await getResolvedGoal(GOAL_ADDRESS);
    expect(resolved).toMatchObject({
      routeAddress: GOAL_ADDRESS,
      goalTreasuryAddress: GOAL_ADDRESS,
      projectChainId: 8453,
      projectId: 42,
      accountingTokenSymbol: "USDC",
    });

    const overview = await getGoalOverviewData(GOAL_ADDRESS);
    expect(overview?.raised).toBe(500000);
    expect(overview?.target).toBe(1000000);
    expect(overview?.goalScope.url).toBe("https://co.build/build-better");
    expect(juiceboxProjectFindFirstMock).not.toHaveBeenCalled();
  });

  it("resolves non-address routes from canonical goal_treasury slug/domain fields", async () => {
    goalTreasuryFindFirstMock.mockResolvedValueOnce({
      id: GOAL_ADDRESS,
      flowAddress: "flow-1",
      stakeVault: "vault-1",
      canonicalProjectChainId: 8453,
      canonicalProjectId: 42,
      canonicalRouteSlug: "build-better",
      canonicalRouteDomain: "co.build",
      goalRevnetId: 42,
      minRaise: 1_000_000_000_000,
      deadline: 1_800_000_000,
      createdAtTimestamp: 1_700_000_000,
      lastSyncedAppliedRate: 1_000_000,
      successAt: 1_800_100_000,
      finalized: true,
    });

    const resolved = await getResolvedGoal("build-better");
    expect(resolved).toMatchObject({
      routeAddress: "build-better",
      goalTreasuryAddress: GOAL_ADDRESS,
      discussionUrl: "https://co.build/build-better",
    });
    expect(goalTreasuryFindFirstMock).toHaveBeenCalled();
  });

  it("builds contributions, treasury chart, milestones, and events from onchain tables", async () => {
    const contributions = await getGoalContributions(GOAL_ADDRESS, 10, 0);
    expect(contributions.items).toHaveLength(2);
    expect(contributions.items[0]?.txHash).toBe("0xtx1");

    const chart = await getGoalTreasuryChartData(GOAL_ADDRESS);
    expect(chart?.points.length).toBeGreaterThan(0);
    expect(chart?.points.at(-1)?.balance).toBeGreaterThan(0);
    expect(chart?.points.at(-1)?.outflow).toBeGreaterThan(0);
    expect(goalTreasurySeriesFindManyMock).toHaveBeenCalled();

    const milestones = await getGoalMilestones(GOAL_ADDRESS);
    expect(milestones.length).toBeGreaterThan(0);
    expect(milestones[0]?.title).toBeTruthy();

    const events = await getGoalEvents(GOAL_ADDRESS, 5);
    expect(events).toHaveLength(1);
    expect(events[0]?.url).toBe("https://basescan.org/tx/0xevt1");

    const globalEvents = await getGlobalGoalEvents(5);
    expect(globalEvents).toHaveLength(1);
    expect(globalEvents[0]?.description).toContain("Build Better");
  });

  it("maps goal cards from goal_treasury + project + grouped pay events", async () => {
    const cards = await getGoalCards();
    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({
      address: "build-better",
      title: "Build Better",
      status: "completed",
      contributorCount: 12,
    });
    expect(cards[0]?.raised).toBe(500000);
  });

  it("returns no goal cards when no goal treasury rows exist", async () => {
    goalTreasuryFindManyMock.mockResolvedValue([]);

    const cards = await getGoalCards();

    expect(cards).toEqual([]);
    expect(juiceboxProjectFindManyMock).not.toHaveBeenCalled();
    expect(juiceboxPayEventGroupByMock).not.toHaveBeenCalled();
  });

  it("builds user holdings from grouped payer contributions", async () => {
    const holdings = await getUserGoalHoldings(USER_ADDRESS, 10);
    expect(holdings).toHaveLength(1);
    expect(holdings[0]).toMatchObject({
      id: GOAL_ADDRESS,
      address: "build-better",
      title: "Build Better",
      yourContribution: 210,
      status: "completed",
    });
    expect(holdings[0]?.firstContributedAt).toEqual(new Date(1_700_000_100 * 1000));
  });

  it("builds allocate data with subgoals, user stake, and recent activity", async () => {
    const allocateData = await getGoalAllocateData(GOAL_ADDRESS, USER_ADDRESS);
    expect(allocateData).not.toBeNull();
    expect(allocateData?.subGoals).toHaveLength(1);
    expect(allocateData?.userStats.staked).toBeGreaterThan(0);
    expect(allocateData?.agentAllocations.length).toBeGreaterThan(0);
    expect(allocateData?.recentActivity[0]?.action).toBe("Fund");
    expect(budgetTreasuryFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["budget-1"] } },
      })
    );
  });

  it("builds builders/funders data scoped to goal tables", async () => {
    const data = await getGoalBuildersData(GOAL_ADDRESS, 10);
    expect(data?.builders).toContain(USER_ADDRESS);
    expect(data?.funders[0]).toMatchObject({ address: "0xfunder" });
    expect(data?.tokenSymbol).toBe("USDC");
  });
});
