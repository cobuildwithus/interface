import "server-only";

import { getSession } from "@/lib/domains/auth/session";
import { getUserGoalHoldings } from "@/lib/domains/goals/goal-data";
import { getRevnetSummary } from "@/lib/domains/token/juicebox/revnet-summary";
import { JB_TOKEN_DECIMALS } from "@/lib/domains/token/onchain/revnet";
import { fromBaseUnits } from "@/lib/shared/numbers";

function normalizeSymbol(symbol: string | null | undefined, fallback: string): string {
  const cleaned = symbol?.trim().replace(/^\$/, "");
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

export async function getProfileTokenBalanceData() {
  const summary = await getRevnetSummary();
  return {
    isConnected: Boolean(summary.address),
    tokenSymbol: normalizeSymbol(summary.tokenSymbol, "TOKEN"),
    tokenBalance: Math.max(0, fromBaseUnits(summary.balance, JB_TOKEN_DECIMALS)),
    cashOutValueUsd: Math.max(0, fromBaseUnits(summary.cashOutValue, summary.accountingDecimals)),
  };
}

export async function getProfileGoalHoldingsData() {
  const session = await getSession();
  const address = session.address;
  if (!address) {
    return {
      isConnected: false,
      holdings: [],
      totalContribution: 0,
      goalsFunded: 0,
    };
  }

  const holdings = await getUserGoalHoldings(address, 25);
  const totalContribution = holdings.reduce((sum, holding) => sum + holding.yourContribution, 0);

  return {
    isConnected: true,
    holdings,
    totalContribution,
    goalsFunded: holdings.length,
  };
}
