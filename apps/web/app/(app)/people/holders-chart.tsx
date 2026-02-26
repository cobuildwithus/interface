import { getHoldersHistory } from "@/lib/domains/token/juicebox/holders-history";
import { HoldersChartClient } from "./holders-chart-client";

export async function HoldersChart() {
  const { data, symbol } = await getHoldersHistory();

  if (data.length < 2) {
    return null;
  }

  return <HoldersChartClient data={data} symbol={symbol} />;
}
