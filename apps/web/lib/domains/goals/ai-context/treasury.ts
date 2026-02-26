import "server-only";

import { roundToCents } from "@/lib/shared/numbers";
import { getTreasuryHistory } from "@/lib/domains/token/juicebox/treasury-history";
import {
  buildWindowStats,
  inflowSince,
  last,
  mapWindowStats,
  toUsd,
  valueAtOrBefore,
} from "@/lib/domains/goals/ai-context/utils";
import type { TreasuryStats } from "@/lib/domains/goals/ai-context/types";

export async function getTreasuryStats(
  nowMs: number,
  basePriceUsd: number | null
): Promise<TreasuryStats> {
  const treasuryHistory = await getTreasuryHistory();
  const treasuryData = treasuryHistory.data;
  const treasuryBalance = last(treasuryData)?.balance ?? null;
  const treasuryAt = buildWindowStats(nowMs, (cutoffMs) => valueAtOrBefore(treasuryData, cutoffMs));
  const inflow = mapWindowStats(treasuryAt, (point) => inflowSince(treasuryBalance, point));
  const paceWeekly = {
    last7d: inflow.last7d,
    last30d: inflow.last30d === null ? null : roundToCents(inflow.last30d / (30 / 7)),
  };

  return {
    balance: {
      base: treasuryBalance,
      usd: toUsd(treasuryBalance, basePriceUsd),
    },
    inflow: {
      lifetime: treasuryBalance,
      last6h: inflow.last6h,
      last24h: inflow.last24h,
      last7d: inflow.last7d,
      last30d: inflow.last30d,
    },
    paceWeekly,
  };
}
