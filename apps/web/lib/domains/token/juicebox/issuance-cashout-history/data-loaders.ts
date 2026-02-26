import { base } from "viem/chains";
import juiceboxDb from "@/lib/server/db/cobuild-db-client";
import { PROJECT_ID } from "./constants";
import type { Numberish } from "@/lib/shared/numbers";
import type { RawCashoutSnapshot, RawPayment, RawRuleset } from "./types";

export type ProjectSnapshot = {
  suckerGroupId: string | null;
  accountingTokenSymbol: string;
  accountingDecimals: number | null;
  erc20Symbol: string | null;
  cashoutA: Numberish;
  cashoutB: Numberish;
  balance: Numberish;
  erc20Supply: Numberish;
  pendingReservedTokens: Numberish;
};

export const fetchProject = async (): Promise<ProjectSnapshot> =>
  juiceboxDb.juiceboxProject.findUniqueOrThrow({
    where: { chainId_projectId: { chainId: base.id, projectId: PROJECT_ID } },
    select: {
      suckerGroupId: true,
      accountingTokenSymbol: true,
      accountingDecimals: true,
      erc20Symbol: true,
      cashoutA: true,
      cashoutB: true,
      balance: true,
      erc20Supply: true,
      pendingReservedTokens: true,
    },
  });

export const fetchRulesets = async (suckerGroupId: string | null) => {
  const where = suckerGroupId ? { suckerGroupId } : { chainId: base.id, projectId: PROJECT_ID };

  return (await juiceboxDb.juiceboxRuleset.findMany({
    select: {
      chainId: true,
      projectId: true,
      rulesetId: true,
      start: true,
      duration: true,
      weight: true,
      weightCutPercent: true,
      reservedPercent: true,
      cashOutTaxRate: true,
    },
    where,
    orderBy: { start: "asc" },
  })) as RawRuleset[];
};

export const fetchSnapshots = async (suckerGroupId: string | null) => {
  const where = suckerGroupId ? { suckerGroupId } : { chainId: base.id, projectId: PROJECT_ID };

  return (await juiceboxDb.juiceboxCashoutCoefficientSnapshot.findMany({
    select: {
      chainId: true,
      timestamp: true,
      cashoutA: true,
      cashoutB: true,
      balance: true,
      totalSupply: true,
      cashOutTaxRate: true,
    },
    where,
    orderBy: [{ timestamp: "asc" }, { txHash: "asc" }],
  })) as RawCashoutSnapshot[];
};

export const fetchPayments = async (suckerGroupId: string | null) => {
  const where = suckerGroupId
    ? { suckerGroupId, effectiveTokenCount: { gt: 0 } }
    : { chainId: base.id, projectId: PROJECT_ID, effectiveTokenCount: { gt: 0 } };

  return (await juiceboxDb.juiceboxPayEvent.findMany({
    select: {
      timestamp: true,
      amount: true,
      effectiveTokenCount: true,
      newlyIssuedTokenCount: true,
      rulesetId: true,
      chainId: true,
    },
    where,
    orderBy: { timestamp: "asc" },
  })) as RawPayment[];
};
