import { getSupplyBalanceHistoryBase } from "@/lib/domains/token/juicebox/issuance-supply-balance-history";
import { IssuanceSupplyBalanceChartClient } from "./issuance-supply-balance-chart-client";

export async function IssuanceSupplyBalanceChart() {
  const history = await getSupplyBalanceHistoryBase();

  if (history.data.length === 0) {
    return (
      <div className="bg-muted/30 text-muted-foreground rounded-xl border p-6 text-sm">
        No supply history available yet.
      </div>
    );
  }

  return <IssuanceSupplyBalanceChartClient {...history} />;
}
