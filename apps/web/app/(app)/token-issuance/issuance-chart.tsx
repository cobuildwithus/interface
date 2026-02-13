import type { IssuanceBaseTerms } from "@/lib/domains/token/juicebox/issuance-terms";
import type { IssuanceCashoutHistory } from "@/lib/domains/token/juicebox/issuance-cashout-history";
import { IssuanceChartNowClient } from "./issuance-chart-now-client";

type IssuanceChartProps = {
  terms: IssuanceBaseTerms;
  cashoutHistory: IssuanceCashoutHistory["data"];
  initialNowMs: number;
};

export function IssuanceChart({ terms, cashoutHistory, initialNowMs }: IssuanceChartProps) {
  if (terms.stages.length === 0 || terms.chartData.length === 0) {
    return (
      <div className="bg-muted/30 text-muted-foreground rounded-xl border p-6 text-sm">
        No issuance schedule available yet.
      </div>
    );
  }

  return (
    <IssuanceChartNowClient
      terms={terms}
      cashoutHistory={cashoutHistory}
      initialNowMs={initialNowMs}
    />
  );
}
