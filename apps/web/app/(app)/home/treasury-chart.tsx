import { getTreasuryHistory } from "@/lib/domains/token/juicebox/treasury-history";
import { TreasuryChartClient } from "./treasury-chart-client";

export async function TreasuryChart() {
  const { data, symbol } = await getTreasuryHistory();

  if (data.length < 2) {
    return null;
  }

  return <TreasuryChartClient data={data} symbol={symbol} />;
}
