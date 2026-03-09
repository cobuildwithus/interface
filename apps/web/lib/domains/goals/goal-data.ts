import "server-only";

import { unstable_cache } from "next/cache";
import { isAddress } from "viem";
import { base } from "viem/chains";
import prisma from "@/lib/server/db/cobuild-db-client";
import { COBUILD_JUICEBOX_PROJECT_ID } from "@/lib/domains/token/juicebox/constants";
import { normalizeAddress } from "@/lib/shared/address";
import {
  fromBaseUnits,
  toDecimalString,
  toFiniteNumber,
  type Numberish,
} from "@/lib/shared/numbers";

const DEFAULT_GOAL_SLUG = "raise-1-mil";
const DEFAULT_GOAL_TARGET_USD = 1_000_000;
const DEFAULT_GOAL_ROUTE_DOMAIN = "co.build";
const DAY_MS = 24 * 60 * 60 * 1000;

type GoalTreasuryRow = {
  id: string;
  flowAddress: string | null;
  stakeVault: string | null;
  canonicalProjectChainId: number | null;
  canonicalProjectId: number | null;
  canonicalRouteSlug: string | null;
  canonicalRouteDomain: string | null;
  goalRevnetId: Numberish;
  minRaise: Numberish;
  deadline: Numberish;
  createdAtTimestamp: Numberish;
  lastSyncedAppliedRate: Numberish;
  successAt: Numberish;
  finalized: boolean;
};

type ProjectRow = {
  chainId: number;
  projectId: number;
  name: string | null;
  description: string | null;
  projectTagline: string | null;
  suckerGroupId: string | null;
  accountingTokenSymbol: string;
  accountingDecimals: number;
  contributorsCount: number;
  domain: string | null;
};

type GoalSource = "goal_treasury" | "default_project";

export type ResolvedGoal = {
  input: string;
  routeAddress: string;
  source: GoalSource;
  name: string;
  description: string | null;
  tagline: string | null;
  discussionUrl: string;
  goalTreasuryAddress: string | null;
  flowAddress: string | null;
  stakeVaultAddress: string | null;
  projectChainId: number;
  projectId: number;
  suckerGroupId: string | null;
  accountingTokenSymbol: string;
  accountingDecimals: number;
  targetAmount: number | null;
  deadlineMs: number | null;
  createdAtMs: number | null;
  successAtMs: number | null;
  finalized: boolean;
  contributorsCount: number;
  lastSyncedAppliedRate: Numberish;
};

export type GoalOverviewData = {
  goal: ResolvedGoal;
  raised: number;
  target: number;
  progressTitle: string;
  goalScope: {
    label: string;
    url: string;
  };
};

export type GoalContribution = {
  txHash: string;
  timestamp: number;
  payer: string;
  amount: string;
  project: {
    accountingTokenSymbol: string;
    accountingDecimals: number;
  };
};

export type GoalContributionsPage = {
  items: GoalContribution[];
  hasMore: boolean;
};

export type GoalTreasuryPoint = {
  timestamp: number;
  balance: number;
  inflow: number;
  outflow: number;
};

export type GoalTreasuryChartData = {
  points: GoalTreasuryPoint[];
  symbol: string;
};

export type GoalMilestone = {
  id: string;
  date: string;
  title: string;
  description: string;
  link?: { href: string; label: string };
};

export type GoalEventFeedItem = {
  id: string;
  title: string;
  description: string;
  day: string;
  time: string;
  recurring: string;
  color: "blue" | "purple" | "green" | "orange";
  url?: string;
};

type ActivityLogEventRow = {
  id: string;
  type: string;
  description: string;
  memo: string | null;
  currency: string;
  amount: string;
  timestamp: number;
  txHash: string;
  suckerGroupId?: string;
};

export type GoalCardData = {
  id: string;
  address: string;
  title: string;
  description: string;
  raised: number;
  target: number;
  status: "ongoing" | "completed";
  createdAt: Date;
  completedAt?: Date;
  contributorCount: number;
  projectChainId: number;
  projectId: number;
  suckerGroupId: string | null;
  accountingDecimals: number;
};

export type UserGoalHolding = {
  id: string;
  address: string;
  title: string;
  raised: number;
  target: number;
  yourContribution: number;
  firstContributedAt: Date;
  completedAt?: Date;
  status: "ongoing" | "completed";
};

type SubGoalStatus = "active" | "complete" | "draft" | "needsStake";

export type GoalAllocateData = {
  goalTitle: string;
  systemStats: {
    totalFunding: number;
    dailyFlow: number;
    rewardsLocked: number;
  };
  userStats: {
    staked: number;
    projectedReward: number;
  };
  agentAllocations: Array<{
    sgId: string;
    sgTitle: string;
    stakeAmount: number;
    stakePercent: number;
    status: "active" | "paused" | "complete";
    daysStaked: number;
    rewardsEarned: number;
    progressCurrent: number;
    progressTarget: number;
    progressUnit: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    sgTitle: string;
    amount: number;
    reason: string;
    timestamp: Date;
    isPositive: boolean;
  }>;
  subGoals: Array<{
    id: string;
    title: string;
    status: SubGoalStatus;
    currentFunding: number;
    flowRate: number;
    minBudget?: number;
    maxBudget?: number;
  }>;
};

export type GoalBuildersData = {
  builders: string[];
  funders: Array<{
    address: string;
    balance: string;
  }>;
  tokenSymbol: string | null;
};

function toInt(value: Numberish): number | null {
  const n = toFiniteNumber(value);
  if (n === null) return null;
  if (!Number.isFinite(n)) return null;
  const valueAsInt = Math.trunc(n);
  return valueAsInt;
}

function toUnixMs(value: Numberish): number | null {
  const seconds = toInt(value);
  if (seconds === null || seconds <= 0) return null;
  return seconds * 1000;
}

function normalizeRouteParam(value: string): string {
  return value.trim().toLowerCase();
}

function stripRouteSeparators(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeRouteSlug(value: string | null | undefined): string | null {
  const normalized = normalizeRouteParam(value ?? "");
  const slug = stripRouteSeparators(normalized);
  return slug || null;
}

function normalizeRouteDomain(value: string | null | undefined): string | null {
  const normalized = normalizeRouteParam(value ?? "");
  if (!normalized) return null;
  try {
    const withScheme = normalized.includes("://") ? normalized : `https://${normalized}`;
    const host = new URL(withScheme).hostname.trim().toLowerCase();
    return host || null;
  } catch {
    const host = stripRouteSeparators(normalized);
    return host || null;
  }
}

function goalDisplayNameFromRoute(routeAddress: string): string {
  return routeAddress
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function formatUsdWhole(value: number): string {
  const rounded = Math.max(0, Math.round(value));
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function formatShortDate(valueMs: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(valueMs);
}

function formatMilestoneDate(valueMs: number): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).formatToParts(valueMs);
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  return `${month} '${year}`;
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function humanizeEventType(value: string): string {
  if (!value.trim()) return "Onchain event";
  return titleCase(value);
}

function eventColorFromType(value: string): "blue" | "purple" | "green" | "orange" {
  const normalized = value.toLowerCase();
  if (normalized.includes("pay") || normalized.includes("fund") || normalized.includes("mint")) {
    return "green";
  }
  if (
    normalized.includes("cashout") ||
    normalized.includes("redeem") ||
    normalized.includes("burn") ||
    normalized.includes("withdraw")
  ) {
    return "orange";
  }
  if (normalized.includes("borrow") || normalized.includes("loan")) {
    return "blue";
  }
  return "purple";
}

function mapActivityLogRowToEvent(
  row: ActivityLogEventRow,
  goalLabel?: string | null
): GoalEventFeedItem {
  const eventTime = row.timestamp * 1000;
  const date = new Date(eventTime);
  const amount = toFiniteNumber(row.amount);
  const amountLabel =
    amount !== null && Number.isFinite(amount)
      ? `${Math.abs(amount).toLocaleString()} ${row.currency}`
      : row.currency;
  const baseDescription = row.description || row.memo || "Onchain activity recorded.";

  return {
    id: row.id,
    title: humanizeEventType(row.type),
    description: goalLabel ? `${goalLabel} · ${baseDescription}` : baseDescription,
    day: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date),
    recurring: amountLabel,
    color: eventColorFromType(row.type),
    url: `https://basescan.org/tx/${row.txHash}`,
  };
}

function shortAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function amountPerDay(rawRate: Numberish, decimals: number): number {
  const perSecond = fromBaseUnits(rawRate, decimals);
  return Math.max(0, perSecond * 86400);
}

function buildGoalScope(goal: ResolvedGoal, target: number): { label: string; url: string } {
  const targetLabel = formatUsdWhole(target);
  if (goal.deadlineMs) {
    return {
      label: `Raise ${targetLabel} by ${formatShortDate(goal.deadlineMs)}`,
      url: goal.discussionUrl,
    };
  }
  return {
    label: goal.name || `Goal ${targetLabel}`,
    url: goal.discussionUrl,
  };
}

async function fetchProjectByProjectId(
  chainId: number,
  projectId: number
): Promise<ProjectRow | null> {
  return prisma.juiceboxProject.findUnique({
    where: { chainId_projectId: { chainId, projectId } },
    select: {
      chainId: true,
      projectId: true,
      name: true,
      description: true,
      projectTagline: true,
      suckerGroupId: true,
      accountingTokenSymbol: true,
      accountingDecimals: true,
      contributorsCount: true,
      domain: true,
    },
  });
}

async function fetchResolvedGoal(goalAddress: string): Promise<ResolvedGoal | null> {
  const normalizedGoal = normalizeRouteParam(goalAddress);
  if (!normalizedGoal) return null;

  const isGoalAddress = isAddress(normalizedGoal);
  const canonicalGoalAddress = isGoalAddress ? normalizeAddress(normalizedGoal) : null;

  let source: GoalSource = "default_project";
  let goalTreasury: GoalTreasuryRow | null = null;
  let project: ProjectRow | null = null;
  let routeAddress = normalizedGoal;

  if (canonicalGoalAddress) {
    goalTreasury = await prisma.goalTreasury.findUnique({
      where: { id: canonicalGoalAddress },
      select: {
        id: true,
        flowAddress: true,
        stakeVault: true,
        canonicalProjectChainId: true,
        canonicalProjectId: true,
        canonicalRouteSlug: true,
        canonicalRouteDomain: true,
        goalRevnetId: true,
        minRaise: true,
        deadline: true,
        createdAtTimestamp: true,
        lastSyncedAppliedRate: true,
        successAt: true,
        finalized: true,
      },
    });
  } else {
    goalTreasury = await prisma.goalTreasury.findFirst({
      where: {
        OR: [{ canonicalRouteSlug: normalizedGoal }, { canonicalRouteDomain: normalizedGoal }],
      },
      orderBy: { updatedAtTimestamp: "desc" },
      select: {
        id: true,
        flowAddress: true,
        stakeVault: true,
        canonicalProjectChainId: true,
        canonicalProjectId: true,
        canonicalRouteSlug: true,
        canonicalRouteDomain: true,
        goalRevnetId: true,
        minRaise: true,
        deadline: true,
        createdAtTimestamp: true,
        lastSyncedAppliedRate: true,
        successAt: true,
        finalized: true,
      },
    });
    if (goalTreasury) {
      source = "goal_treasury";
      routeAddress = normalizeRouteSlug(goalTreasury.canonicalRouteSlug) ?? goalTreasury.id;
    }
  }

  if (goalTreasury?.canonicalProjectChainId && goalTreasury.canonicalProjectId) {
    project = await fetchProjectByProjectId(
      goalTreasury.canonicalProjectChainId,
      goalTreasury.canonicalProjectId
    );
    source = "goal_treasury";
  } else if (normalizedGoal === DEFAULT_GOAL_SLUG) {
    project = await fetchProjectByProjectId(base.id, COBUILD_JUICEBOX_PROJECT_ID);
    source = "default_project";
  }

  if (!project) return null;

  const targetAmount = goalTreasury?.minRaise
    ? fromBaseUnits(goalTreasury.minRaise, project.accountingDecimals)
    : normalizedGoal === DEFAULT_GOAL_SLUG
      ? DEFAULT_GOAL_TARGET_USD
      : null;

  const routeSlug = normalizeRouteSlug(goalTreasury?.canonicalRouteSlug) ?? routeAddress;
  const routeDomain = normalizeRouteDomain(goalTreasury?.canonicalRouteDomain);
  const discussionUrl = `https://${routeDomain ?? DEFAULT_GOAL_ROUTE_DOMAIN}/${routeSlug}`;

  return {
    input: goalAddress,
    routeAddress,
    source,
    name: project.name?.trim() || goalDisplayNameFromRoute(routeAddress) || "Cobuild goal",
    description: project.description,
    tagline: project.projectTagline,
    discussionUrl,
    goalTreasuryAddress: goalTreasury?.id ?? null,
    flowAddress: goalTreasury?.flowAddress ?? null,
    stakeVaultAddress: goalTreasury?.stakeVault ?? null,
    projectChainId: project.chainId,
    projectId: project.projectId,
    suckerGroupId: project.suckerGroupId,
    accountingTokenSymbol: project.accountingTokenSymbol,
    accountingDecimals: project.accountingDecimals ?? 18,
    targetAmount,
    deadlineMs: toUnixMs(goalTreasury?.deadline),
    createdAtMs: toUnixMs(goalTreasury?.createdAtTimestamp),
    successAtMs: toUnixMs(goalTreasury?.successAt),
    finalized: Boolean(goalTreasury?.finalized),
    contributorsCount: project.contributorsCount,
    lastSyncedAppliedRate: goalTreasury?.lastSyncedAppliedRate ?? 0,
  };
}

async function fetchRaisedAmount(goal: ResolvedGoal): Promise<number> {
  const where =
    goal.suckerGroupId !== null
      ? { suckerGroupId: goal.suckerGroupId, newlyIssuedTokenCount: { gt: 0 } }
      : {
          chainId: goal.projectChainId,
          projectId: goal.projectId,
          newlyIssuedTokenCount: { gt: 0 },
        };

  const aggregate = await prisma.juiceboxPayEvent.aggregate({
    where,
    _sum: {
      amount: true,
    },
  });

  return fromBaseUnits(aggregate._sum.amount ?? 0, goal.accountingDecimals);
}

export const getResolvedGoal = unstable_cache(
  (goalAddress: string) => fetchResolvedGoal(goalAddress),
  ["goal-resolved-v2"],
  { revalidate: 60 }
);

async function fetchGoalOverviewData(goalAddress: string): Promise<GoalOverviewData | null> {
  const goal = await getResolvedGoal(goalAddress);
  if (!goal) return null;

  const raised = await fetchRaisedAmount(goal);
  const target = goal.targetAmount ?? Math.max(raised, 1);
  const goalScope = buildGoalScope(goal, target);

  return {
    goal,
    raised,
    target,
    progressTitle: goalScope.label,
    goalScope,
  };
}

export const getGoalOverviewData = unstable_cache(
  (goalAddress: string) => fetchGoalOverviewData(goalAddress),
  ["goal-overview-v1"],
  { revalidate: 60 }
);

async function fetchGoalContributions(
  goalAddress: string,
  limit: number,
  offset: number
): Promise<GoalContributionsPage> {
  const goal = await getResolvedGoal(goalAddress);
  if (!goal) return { items: [], hasMore: false };

  const where =
    goal.suckerGroupId !== null
      ? { suckerGroupId: goal.suckerGroupId, effectiveTokenCount: { gt: 0 } }
      : {
          chainId: goal.projectChainId,
          projectId: goal.projectId,
          effectiveTokenCount: { gt: 0 },
        };

  const rows = await prisma.juiceboxPayEvent.findMany({
    where,
    orderBy: { timestamp: "desc" },
    skip: offset,
    take: limit + 1,
    select: {
      txHash: true,
      timestamp: true,
      payer: true,
      amount: true,
    },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: items.map((row) => ({
      txHash: row.txHash,
      timestamp: row.timestamp,
      payer: row.payer,
      amount: toDecimalString(row.amount),
      project: {
        accountingTokenSymbol: goal.accountingTokenSymbol,
        accountingDecimals: goal.accountingDecimals,
      },
    })),
    hasMore,
  };
}

export const getGoalContributions = unstable_cache(
  (goalAddress: string, limit: number = 10, offset: number = 0) =>
    fetchGoalContributions(goalAddress, limit, offset),
  ["goal-contributions-v1"],
  { revalidate: 60 }
);

async function fetchGoalTreasuryChartData(
  goalAddress: string
): Promise<GoalTreasuryChartData | null> {
  const goal = await getResolvedGoal(goalAddress);
  if (!goal) return null;

  if (!goal.goalTreasuryAddress) {
    return {
      points: [],
      symbol: goal.accountingTokenSymbol,
    };
  }

  const rows = await prisma.goalTreasurySeries.findMany({
    where: { goalTreasury: goal.goalTreasuryAddress },
    orderBy: { timestamp: "asc" },
    select: {
      timestamp: true,
      balance: true,
      inflow: true,
      outflow: true,
    },
  });

  const points = rows.map((row) => ({
    timestamp: (toInt(row.timestamp) ?? 0) * 1000,
    balance: fromBaseUnits(row.balance, goal.accountingDecimals),
    inflow: fromBaseUnits(row.inflow, goal.accountingDecimals),
    outflow: fromBaseUnits(row.outflow, goal.accountingDecimals),
  }));

  return {
    points,
    symbol: goal.accountingTokenSymbol,
  };
}

export const getGoalTreasuryChartData = unstable_cache(
  (goalAddress: string) => fetchGoalTreasuryChartData(goalAddress),
  ["goal-treasury-chart-v2"],
  { revalidate: 300 }
);

async function fetchGoalMilestones(goalAddress: string): Promise<GoalMilestone[]> {
  const goal = await getResolvedGoal(goalAddress);
  if (!goal) return [];

  const where =
    goal.suckerGroupId !== null
      ? { suckerGroupId: goal.suckerGroupId, newlyIssuedTokenCount: { gt: 0 } }
      : {
          chainId: goal.projectChainId,
          projectId: goal.projectId,
          newlyIssuedTokenCount: { gt: 0 },
        };

  const [firstPayment, latestPayment] = await Promise.all([
    prisma.juiceboxPayEvent.findFirst({
      where,
      orderBy: { timestamp: "asc" },
      select: { txHash: true, timestamp: true, amount: true },
    }),
    prisma.juiceboxPayEvent.findFirst({
      where,
      orderBy: { timestamp: "desc" },
      select: { txHash: true, timestamp: true, amount: true },
    }),
  ]);

  const milestones: Array<GoalMilestone & { dateMs: number }> = [];

  if (goal.createdAtMs) {
    milestones.push({
      id: "deployed",
      dateMs: goal.createdAtMs,
      date: formatMilestoneDate(goal.createdAtMs),
      title: "Goal treasury deployed",
      description: `Onchain goal treasury ${shortAddress(goal.goalTreasuryAddress ?? goal.routeAddress)} created.`,
    });
  }

  if (firstPayment) {
    const timestampMs = firstPayment.timestamp * 1000;
    milestones.push({
      id: `first-pay-${firstPayment.txHash}`,
      dateMs: timestampMs,
      date: formatMilestoneDate(timestampMs),
      title: "First contribution received",
      description: `${formatUsdWhole(fromBaseUnits(firstPayment.amount, goal.accountingDecimals))} entered the treasury.`,
      link: {
        href: `https://basescan.org/tx/${firstPayment.txHash}`,
        label: "View transaction",
      },
    });
  }

  if (latestPayment && latestPayment.txHash !== firstPayment?.txHash) {
    const timestampMs = latestPayment.timestamp * 1000;
    milestones.push({
      id: `latest-pay-${latestPayment.txHash}`,
      dateMs: timestampMs,
      date: formatMilestoneDate(timestampMs),
      title: "Latest contribution",
      description: `${formatUsdWhole(fromBaseUnits(latestPayment.amount, goal.accountingDecimals))} added to treasury.`,
      link: {
        href: `https://basescan.org/tx/${latestPayment.txHash}`,
        label: "View transaction",
      },
    });
  }

  if (goal.successAtMs) {
    milestones.push({
      id: "success",
      dateMs: goal.successAtMs,
      date: formatMilestoneDate(goal.successAtMs),
      title: "Goal marked successful",
      description: "Success condition asserted onchain.",
    });
  }

  return milestones
    .sort((a, b) => b.dateMs - a.dateMs)
    .map(({ dateMs: _dateMs, ...milestone }) => milestone);
}

export const getGoalMilestones = unstable_cache(
  (goalAddress: string) => fetchGoalMilestones(goalAddress),
  ["goal-milestones-v1"],
  { revalidate: 300 }
);

async function fetchGoalEvents(goalAddress: string, limit: number): Promise<GoalEventFeedItem[]> {
  const goal = await getResolvedGoal(goalAddress);
  if (!goal?.suckerGroupId) return [];

  const rows = await prisma.juiceboxActivityLog.findMany({
    where: {
      suckerGroupId: goal.suckerGroupId,
    },
    orderBy: {
      timestamp: "desc",
    },
    take: limit,
    select: {
      id: true,
      type: true,
      description: true,
      memo: true,
      currency: true,
      amount: true,
      timestamp: true,
      txHash: true,
    },
  });

  return rows.map((row) => mapActivityLogRowToEvent(row));
}

export const getGoalEvents = unstable_cache(
  (goalAddress: string, limit: number = 12) => fetchGoalEvents(goalAddress, limit),
  ["goal-events-v1"],
  { revalidate: 120 }
);

async function fetchGlobalGoalEvents(limit: number): Promise<GoalEventFeedItem[]> {
  const goalRows = await prisma.goalTreasury.findMany({
    select: {
      canonicalProjectChainId: true,
      canonicalProjectId: true,
    },
    orderBy: {
      updatedAtTimestamp: "desc",
    },
    take: 200,
  });

  const canonicalProjects = goalRows
    .map((row) =>
      row.canonicalProjectChainId && row.canonicalProjectId
        ? {
            chainId: row.canonicalProjectChainId,
            projectId: row.canonicalProjectId,
          }
        : null
    )
    .filter((value): value is { chainId: number; projectId: number } => value !== null);
  if (canonicalProjects.length === 0) return [];

  const uniqueProjectKeys = Array.from(
    new Map(
      canonicalProjects.map((project) => [`${project.chainId}:${project.projectId}`, project])
    ).values()
  );

  const projects = await prisma.juiceboxProject.findMany({
    where: {
      OR: uniqueProjectKeys.map((project) => ({
        chainId: project.chainId,
        projectId: project.projectId,
        suckerGroupId: { not: null },
      })),
    },
    select: {
      chainId: true,
      projectId: true,
      name: true,
      suckerGroupId: true,
    },
  });

  const goalLabelBySuckerGroup = new Map<string, string>();
  for (const project of projects) {
    const suckerGroupId = project.suckerGroupId;
    if (!suckerGroupId || goalLabelBySuckerGroup.has(suckerGroupId)) continue;
    goalLabelBySuckerGroup.set(
      suckerGroupId,
      project.name?.trim() || `Goal ${project.chainId}:${project.projectId}`
    );
  }

  const suckerGroupIds = Array.from(goalLabelBySuckerGroup.keys());
  if (suckerGroupIds.length === 0) return [];

  const rows = await prisma.juiceboxActivityLog.findMany({
    where: {
      suckerGroupId: {
        in: suckerGroupIds,
      },
    },
    orderBy: {
      timestamp: "desc",
    },
    take: limit,
    select: {
      id: true,
      type: true,
      description: true,
      memo: true,
      currency: true,
      amount: true,
      timestamp: true,
      txHash: true,
      suckerGroupId: true,
    },
  });

  return rows.map((row) =>
    mapActivityLogRowToEvent(row, goalLabelBySuckerGroup.get(row.suckerGroupId))
  );
}

export const getGlobalGoalEvents = unstable_cache(
  (limit: number = 12) => fetchGlobalGoalEvents(limit),
  ["goal-global-events-v2"],
  { revalidate: 120 }
);

async function fetchGoalCards(): Promise<GoalCardData[]> {
  const rows = await prisma.goalTreasury.findMany({
    orderBy: {
      createdAtTimestamp: "desc",
    },
    take: 100,
    select: {
      id: true,
      canonicalProjectChainId: true,
      canonicalProjectId: true,
      canonicalRouteSlug: true,
      minRaise: true,
      createdAtTimestamp: true,
      successAt: true,
      finalized: true,
      deadline: true,
    },
  });

  if (rows.length === 0) return [];

  const canonicalProjects = rows
    .map((row) =>
      row.canonicalProjectChainId && row.canonicalProjectId
        ? {
            chainId: row.canonicalProjectChainId,
            projectId: row.canonicalProjectId,
          }
        : null
    )
    .filter((value): value is { chainId: number; projectId: number } => value !== null);
  if (canonicalProjects.length === 0) return [];

  const uniqueProjectKeys = Array.from(
    new Map(
      canonicalProjects.map((project) => [`${project.chainId}:${project.projectId}`, project])
    ).values()
  );

  const [projects, payEventSums] = await Promise.all([
    prisma.juiceboxProject.findMany({
      where: {
        OR: uniqueProjectKeys.map((project) => ({
          chainId: project.chainId,
          projectId: project.projectId,
        })),
      },
      select: {
        chainId: true,
        projectId: true,
        name: true,
        description: true,
        projectTagline: true,
        suckerGroupId: true,
        accountingTokenSymbol: true,
        accountingDecimals: true,
        contributorsCount: true,
      },
    }),
    prisma.juiceboxPayEvent.groupBy({
      by: ["chainId", "projectId"],
      where: {
        OR: uniqueProjectKeys.map((project) => ({
          chainId: project.chainId,
          projectId: project.projectId,
        })),
        newlyIssuedTokenCount: { gt: 0 },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const projectMap = new Map(
    projects.map((project) => [`${project.chainId}:${project.projectId}`, project])
  );
  const raisedByProjectId = new Map(
    payEventSums.map((entry) => [`${entry.chainId}:${entry.projectId}`, entry._sum.amount ?? 0])
  );

  return rows
    .map((row) => {
      if (!row.canonicalProjectChainId || !row.canonicalProjectId) return null;

      const projectKey = `${row.canonicalProjectChainId}:${row.canonicalProjectId}`;
      const project = projectMap.get(projectKey);
      if (!project) return null;

      const decimals = project.accountingDecimals ?? 18;
      const raised = fromBaseUnits(raisedByProjectId.get(projectKey) ?? 0, decimals);
      const targetAmount = row.minRaise
        ? fromBaseUnits(row.minRaise, decimals)
        : Math.max(raised, 1);
      const createdAt = toUnixMs(row.createdAtTimestamp);
      const successAt = toUnixMs(row.successAt);
      const deadlineMs = toUnixMs(row.deadline);
      const isCompleted = row.finalized || successAt !== null;

      return {
        id: row.id,
        address: normalizeRouteSlug(row.canonicalRouteSlug) ?? row.id,
        title: project.name?.trim() || `Goal ${shortAddress(row.id)}`,
        description:
          project.description?.trim() ||
          project.projectTagline?.trim() ||
          "Onchain goal and treasury allocation system.",
        raised,
        target: targetAmount,
        status: isCompleted ? ("completed" as const) : ("ongoing" as const),
        createdAt: createdAt ? new Date(createdAt) : new Date(0),
        ...(successAt
          ? { completedAt: new Date(successAt) }
          : isCompleted && deadlineMs
            ? { completedAt: new Date(deadlineMs) }
            : {}),
        contributorCount: project.contributorsCount,
        projectChainId: row.canonicalProjectChainId,
        projectId: row.canonicalProjectId,
        suckerGroupId: project.suckerGroupId,
        accountingDecimals: decimals,
      };
    })
    .filter((row): row is GoalCardData => row !== null);
}

export const getGoalCards = unstable_cache(fetchGoalCards, ["goal-cards-v2"], { revalidate: 120 });

async function fetchUserGoalHoldings(
  userAddress: string,
  limit: number
): Promise<UserGoalHolding[]> {
  if (!isAddress(userAddress)) return [];
  if (limit <= 0) return [];

  const normalizedUser = normalizeAddress(userAddress);
  const goals = await getGoalCards();
  if (goals.length === 0) return [];

  const goalIds = goals.map((goal) => goal.id);
  const contributionRows =
    goalIds.length > 0
      ? await prisma.goalContributorAggregate.findMany({
          where: {
            contributor: normalizedUser,
            goalTreasury: { in: goalIds },
          },
          select: {
            goalTreasury: true,
            totalContributed: true,
            firstContributedAt: true,
          },
        })
      : [];
  const contributionByGoal = new Map(
    contributionRows.map((row) => [row.goalTreasury, row] as const)
  );

  const holdings = goals
    .map((goal) => {
      const contribution = contributionByGoal.get(goal.id);
      if (!contribution) return null;

      const yourContribution = fromBaseUnits(
        contribution.totalContributed,
        goal.accountingDecimals
      );
      if (!Number.isFinite(yourContribution) || yourContribution <= 0) return null;

      const firstContributedAt = contribution.firstContributedAt
        ? new Date(contribution.firstContributedAt * 1000)
        : goal.createdAt;

      return {
        id: goal.id,
        address: goal.address,
        title: goal.title,
        raised: goal.raised,
        target: goal.target,
        yourContribution,
        firstContributedAt,
        ...(goal.completedAt ? { completedAt: goal.completedAt } : {}),
        status: goal.status,
      };
    })
    .filter((holding): holding is UserGoalHolding => holding !== null)
    .sort((a, b) => b.firstContributedAt.getTime() - a.firstContributedAt.getTime());

  return holdings.slice(0, limit);
}

export const getUserGoalHoldings = unstable_cache(
  (userAddress: string, limit: number = 20) => fetchUserGoalHoldings(userAddress, limit),
  ["goal-user-holdings-v1"],
  { revalidate: 120 }
);

async function fetchGoalAllocateData(
  goalAddress: string,
  userAddress: string | null
): Promise<GoalAllocateData | null> {
  const [overview, goal] = await Promise.all([
    getGoalOverviewData(goalAddress),
    getResolvedGoal(goalAddress),
  ]);
  if (!overview || !goal) return null;

  const normalizedUser =
    userAddress && isAddress(userAddress) ? normalizeAddress(userAddress) : null;

  const flowRecipientsPromise = goal.flowAddress
    ? prisma.flowRecipient.findMany({
        where: { flowId: goal.flowAddress },
        orderBy: [{ recipientIndex: "asc" }],
        select: {
          id: true,
          recipientId: true,
          recipient: true,
          budgetTreasury: true,
          title: true,
          tagline: true,
          isRemoved: true,
          updatedAtTimestamp: true,
        },
      })
    : Promise.resolve([]);

  const stakeVaultPromise = goal.stakeVaultAddress
    ? prisma.stakeVault.findUnique({
        where: { id: goal.stakeVaultAddress },
        select: {
          goalTotalStaked: true,
          goalTotalWithdrawn: true,
        },
      })
    : Promise.resolve(null);

  const hookFundingPromise = goal.goalTreasuryAddress
    ? prisma.hookFunding.findMany({
        where: { goalTreasury: goal.goalTreasuryAddress },
        orderBy: { timestamp: "desc" },
        take: 8,
        select: {
          id: true,
          kind: true,
          amount: true,
          sourceAmount: true,
          superTokenAmount: true,
          beneficiary: true,
          timestamp: true,
        },
      })
    : Promise.resolve([]);

  const [flowRecipients, stakeVault, hookFundingRows] = await Promise.all([
    flowRecipientsPromise,
    stakeVaultPromise,
    hookFundingPromise,
  ]);

  const budgetIds = Array.from(
    new Set(
      flowRecipients
        .map((recipient) => recipient.budgetTreasury)
        .filter((value): value is string => Boolean(value))
    )
  );

  const budgets = budgetIds.length
    ? await prisma.budgetTreasury.findMany({
        where: {
          id: { in: budgetIds },
        },
        select: {
          id: true,
          recipientId: true,
          state: true,
          activationThreshold: true,
          runwayCap: true,
          lastSyncedAppliedRate: true,
          lastSyncedTreasuryBalance: true,
        },
      })
    : [];

  const budgetById = new Map(budgets.map((budget) => [budget.id, budget]));

  const subGoals = flowRecipients.map((recipient) => {
    const budget = recipient.budgetTreasury ? budgetById.get(recipient.budgetTreasury) : undefined;
    const currentFunding = budget
      ? fromBaseUnits(budget.lastSyncedTreasuryBalance, goal.accountingDecimals)
      : 0;
    const flowRate = budget
      ? amountPerDay(budget.lastSyncedAppliedRate, goal.accountingDecimals)
      : 0;
    const minBudget = budget?.activationThreshold
      ? fromBaseUnits(budget.activationThreshold, goal.accountingDecimals)
      : undefined;
    const maxBudget = budget?.runwayCap
      ? fromBaseUnits(budget.runwayCap, goal.accountingDecimals)
      : undefined;

    const status: SubGoalStatus = recipient.isRemoved
      ? "complete"
      : budget === undefined
        ? "draft"
        : minBudget && currentFunding < minBudget
          ? "needsStake"
          : "active";

    return {
      id: recipient.recipientId,
      title:
        recipient.title?.trim() ||
        recipient.tagline?.trim() ||
        `Subgoal ${shortAddress(recipient.recipient)}`,
      status,
      currentFunding,
      flowRate,
      ...(minBudget && minBudget > 0 ? { minBudget } : {}),
      ...(maxBudget && maxBudget > 0 ? { maxBudget } : {}),
    };
  });

  if (subGoals.length === 0) {
    subGoals.push({
      id: goal.routeAddress,
      title: goal.name,
      status: goal.finalized ? "complete" : "active",
      currentFunding: overview.raised,
      flowRate: amountPerDay(0, goal.accountingDecimals),
      ...(overview.target > 0 ? { maxBudget: overview.target } : {}),
    });
  }

  const totalSubgoalFunding = subGoals.reduce((sum, item) => sum + item.currentFunding, 0);
  const dailyFlowFromSubgoals = subGoals.reduce((sum, item) => sum + item.flowRate, 0);

  const rewardsLockedBase = stakeVault
    ? (toFiniteNumber(stakeVault.goalTotalStaked) ?? 0) -
      (toFiniteNumber(stakeVault.goalTotalWithdrawn) ?? 0)
    : 0;
  const rewardsLocked = Math.max(0, fromBaseUnits(rewardsLockedBase, goal.accountingDecimals));

  const dailyFlowFromGoal = amountPerDay(goal.lastSyncedAppliedRate, goal.accountingDecimals);
  const dailyFlow = dailyFlowFromGoal > 0 ? dailyFlowFromGoal : dailyFlowFromSubgoals;

  const userStakedPositions =
    normalizedUser && goal.stakeVaultAddress
      ? await prisma.stakePosition.findMany({
          where: {
            vault: goal.stakeVaultAddress,
            account: normalizedUser,
          },
          select: {
            staked: true,
            withdrawn: true,
          },
        })
      : [];

  const userStakedBase = userStakedPositions.reduce((sum, position) => {
    const staked = toFiniteNumber(position.staked) ?? 0;
    const withdrawn = toFiniteNumber(position.withdrawn) ?? 0;
    return sum + Math.max(0, staked - withdrawn);
  }, 0);
  const userStaked = fromBaseUnits(userStakedBase, goal.accountingDecimals);

  const projectedRewardAggregate = normalizedUser
    ? await prisma.premiumAccount.aggregate({
        where: { account: normalizedUser },
        _sum: { claimableAmount: true },
      })
    : null;
  const projectedReward = fromBaseUnits(
    projectedRewardAggregate?._sum.claimableAmount ?? 0,
    goal.accountingDecimals
  );

  const allocationCheckpoints =
    normalizedUser && budgets.length > 0
      ? await prisma.allocationCheckpoint.findMany({
          where: {
            account: normalizedUser,
            budget: {
              in: budgets.map((budget) => budget.id),
            },
          },
          orderBy: {
            checkpointTimestamp: "desc",
          },
          take: 200,
        })
      : [];

  const latestCheckpointByBudget = new Map<string, (typeof allocationCheckpoints)[number]>();
  for (const checkpoint of allocationCheckpoints) {
    if (!latestCheckpointByBudget.has(checkpoint.budget)) {
      latestCheckpointByBudget.set(checkpoint.budget, checkpoint);
    }
  }

  const totalCheckpointStake = Array.from(latestCheckpointByBudget.values()).reduce(
    (sum, checkpoint) => {
      return sum + fromBaseUnits(checkpoint.allocatedStake, goal.accountingDecimals);
    },
    0
  );
  const stakeDenominator = userStaked > 0 ? userStaked : totalCheckpointStake;

  const subGoalById = new Map(subGoals.map((subGoal) => [subGoal.id, subGoal]));
  const nowMs = Date.now();

  const agentAllocations = Array.from(latestCheckpointByBudget.values())
    .map((checkpoint) => {
      const budget = budgetById.get(checkpoint.budget);
      const sg = budget?.recipientId ? subGoalById.get(budget.recipientId) : null;
      if (!sg) return null;
      const stakeAmount = fromBaseUnits(checkpoint.allocatedStake, goal.accountingDecimals);
      const stakePercent = stakeDenominator > 0 ? (stakeAmount / stakeDenominator) * 100 : 0;
      const checkpointMs = toUnixMs(checkpoint.checkpointTimestamp);
      const daysStaked =
        checkpointMs !== null ? Math.max(0, Math.floor((nowMs - checkpointMs) / DAY_MS)) : 0;
      const progressTarget = sg.maxBudget ?? sg.minBudget ?? Math.max(sg.currentFunding, 1);

      return {
        sgId: sg.id,
        sgTitle: sg.title,
        stakeAmount,
        stakePercent,
        status: sg.status === "complete" ? ("complete" as const) : ("active" as const),
        daysStaked,
        rewardsEarned: projectedReward * (stakePercent / 100),
        progressCurrent: sg.currentFunding,
        progressTarget,
        progressUnit: goal.accountingTokenSymbol,
      };
    })
    .filter((allocation): allocation is NonNullable<typeof allocation> => allocation !== null)
    .sort((a, b) => b.stakeAmount - a.stakeAmount);

  const fallbackSubGoal = subGoals[0];
  if (agentAllocations.length === 0 && fallbackSubGoal && userStaked > 0) {
    const progressTarget =
      fallbackSubGoal.maxBudget ??
      fallbackSubGoal.minBudget ??
      Math.max(fallbackSubGoal.currentFunding, 1);
    agentAllocations.push({
      sgId: fallbackSubGoal.id,
      sgTitle: fallbackSubGoal.title,
      stakeAmount: userStaked,
      stakePercent: 100,
      status: fallbackSubGoal.status === "complete" ? "complete" : "active",
      daysStaked: 0,
      rewardsEarned: projectedReward,
      progressCurrent: fallbackSubGoal.currentFunding,
      progressTarget,
      progressUnit: goal.accountingTokenSymbol,
    });
  }

  const recipientByAddress = new Map(
    flowRecipients.map((recipient) => [recipient.recipient, recipient])
  );

  const recentActivity = hookFundingRows.map((row) => {
    const resolvedAmount =
      toFiniteNumber(row.sourceAmount) ??
      toFiniteNumber(row.superTokenAmount) ??
      toFiniteNumber(row.amount) ??
      0;
    const amount = fromBaseUnits(resolvedAmount, goal.accountingDecimals);
    const linkedRecipient = row.beneficiary ? recipientByAddress.get(row.beneficiary) : null;
    const isPositive = !/burn|slash|penalty|liquidate|withdraw/.test(row.kind.toLowerCase());

    return {
      id: row.id,
      action: humanizeEventType(row.kind),
      sgTitle:
        linkedRecipient?.title?.trim() ||
        linkedRecipient?.tagline?.trim() ||
        (linkedRecipient ? `Subgoal ${shortAddress(linkedRecipient.recipient)}` : goal.name),
      amount: Math.abs(amount),
      reason: row.beneficiary
        ? `Beneficiary: ${shortAddress(row.beneficiary)}`
        : "Onchain goal funding event",
      timestamp: new Date((toInt(row.timestamp) ?? 0) * 1000),
      isPositive,
    };
  });

  return {
    goalTitle: overview.progressTitle,
    systemStats: {
      totalFunding: totalSubgoalFunding > 0 ? totalSubgoalFunding : overview.raised,
      dailyFlow,
      rewardsLocked,
    },
    userStats: {
      staked: userStaked,
      projectedReward,
    },
    agentAllocations,
    recentActivity,
    subGoals,
  };
}

export const getGoalAllocateData = unstable_cache(
  (goalAddress: string, userAddress: string | null) =>
    fetchGoalAllocateData(goalAddress, userAddress),
  ["goal-allocate-data-v1"],
  { revalidate: 60 }
);

async function fetchGoalBuildersData(
  goalAddress: string,
  limit: number
): Promise<GoalBuildersData | null> {
  const goal = await getResolvedGoal(goalAddress);
  if (!goal) return null;

  const builders =
    goal.stakeVaultAddress === null
      ? []
      : await prisma.stakePosition.findMany({
          where: {
            vault: goal.stakeVaultAddress,
          },
          orderBy: {
            staked: "desc",
          },
          take: limit * 2,
          select: {
            account: true,
            staked: true,
            withdrawn: true,
          },
        });

  const builderAddresses = builders
    .map((row) => {
      const net = (toFiniteNumber(row.staked) ?? 0) - (toFiniteNumber(row.withdrawn) ?? 0);
      return { address: row.account, net };
    })
    .filter((row) => row.net > 0)
    .sort((a, b) => b.net - a.net)
    .map((row) => row.address);

  const uniqueBuilders = Array.from(new Set(builderAddresses)).slice(0, limit);

  const funders =
    goal.suckerGroupId === null
      ? []
      : await prisma.juiceboxParticipant.findMany({
          where: {
            suckerGroupId: goal.suckerGroupId,
            balance: { gt: 0 },
          },
          orderBy: { balance: "desc" },
          take: limit,
          select: {
            address: true,
            balance: true,
          },
        });

  return {
    builders: uniqueBuilders,
    funders: funders.map((funder) => ({
      address: funder.address,
      balance: toDecimalString(funder.balance),
    })),
    tokenSymbol: goal.accountingTokenSymbol,
  };
}

export const getGoalBuildersData = unstable_cache(
  (goalAddress: string, limit: number = 24) => fetchGoalBuildersData(goalAddress, limit),
  ["goal-builders-v1"],
  { revalidate: 120 }
);
