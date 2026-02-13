import { PageHeader } from "@/components/layout/page-header";
import { getIssuanceTermsBase } from "@/lib/domains/token/juicebox/issuance-terms";
import { getIssuanceCashoutHistoryBase } from "@/lib/domains/token/juicebox/issuance-cashout-history";
import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { IssuanceChart } from "./issuance-chart";
import { IssuanceSupplyBalanceChart } from "./issuance-supply-balance-chart";
import { IssuanceTable } from "./issuance-table";

export const metadata = buildPageMetadata({
  title: "Token Issuance | Cobuild",
  description: "Issuance schedule and supply history for the Cobuild token.",
});

export default async function TokenIssuancePage() {
  const [terms, cashoutHistory] = await Promise.all([
    getIssuanceTermsBase(),
    getIssuanceCashoutHistoryBase(),
  ]);
  const lastCashoutTimestamp = cashoutHistory.data[cashoutHistory.data.length - 1]?.timestamp;
  const fallbackStageStart = terms.stages[terms.stages.length - 1]?.start ?? 0;
  const initialNowMs = lastCashoutTimestamp ?? fallbackStageStart;

  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader title="Token issuance" description="Issuance schedule and pricing" />

      <div className="flex flex-col gap-6">
        <IssuanceChart
          terms={terms}
          cashoutHistory={cashoutHistory.data}
          initialNowMs={initialNowMs}
        />
        <IssuanceTable terms={terms} initialNowMs={initialNowMs} />
        <IssuanceSupplyBalanceChart />
      </div>
    </main>
  );
}
