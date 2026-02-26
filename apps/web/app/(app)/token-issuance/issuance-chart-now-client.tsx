"use client";

import { useMemo } from "react";
import type { IssuanceBaseTerms } from "@/lib/domains/token/juicebox/issuance-terms";
import type { IssuanceCashoutHistory } from "@/lib/domains/token/juicebox/issuance-cashout-history";
import {
  buildSummary,
  findActiveStageIndex,
} from "@/lib/domains/token/juicebox/issuance-terms/utils";
import { useNow } from "@/lib/hooks/use-now";
import { IssuanceChartClient } from "./issuance-chart-client";

type IssuanceChartNowClientProps = {
  terms: IssuanceBaseTerms;
  cashoutHistory: IssuanceCashoutHistory["data"];
  initialNowMs: number;
};

export function IssuanceChartNowClient({
  terms,
  cashoutHistory,
  initialNowMs,
}: IssuanceChartNowClientProps) {
  const now = useNow({ intervalMs: 60_000, initialNowMs });
  const summary = useMemo(() => {
    const nowSec = Math.floor(now / 1000);
    const activeStageIndex = findActiveStageIndex(terms.stages, nowSec);
    return buildSummary(terms.stages, activeStageIndex, nowSec);
  }, [terms.stages, now]);

  return (
    <IssuanceChartClient
      data={terms.chartData}
      summary={summary}
      baseSymbol={terms.baseSymbol}
      chartStart={terms.chartStart}
      chartEnd={terms.chartEnd}
      now={now}
      cashoutHistory={cashoutHistory}
    />
  );
}
