import { getProjectStats } from "@/lib/domains/token/onchain/project-stats";
import { formatUsd } from "@/lib/shared/currency/format";

function formatHolders(count: number): string {
  if (count === 0) return "—";
  return count.toLocaleString();
}

export async function TokenStats() {
  const stats = await getProjectStats();

  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="container mx-auto px-4">
        <div className="divide-border grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="hover:bg-background/50 flex h-32 flex-col justify-between p-6 transition-colors md:h-40 md:p-8">
            <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
              Token Price
            </p>
            <p className="font-mono text-4xl font-bold tracking-tight md:text-5xl">
              {stats.priceUsdc !== null ? formatUsd(stats.priceUsdc) : "—"}
            </p>
          </div>
          <div className="hover:bg-background/50 flex h-32 flex-col justify-between p-6 transition-colors md:h-40 md:p-8">
            <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
              Treasury
            </p>
            <p className="font-mono text-4xl font-bold tracking-tight md:text-5xl">
              {stats.treasuryUsdc !== null ? formatUsd(stats.treasuryUsdc) : "—"}
            </p>
          </div>
          <div className="hover:bg-background/50 flex h-32 flex-col justify-between p-6 transition-colors md:h-40 md:p-8">
            <p className="text-muted-foreground font-mono text-sm tracking-wider uppercase">
              Holders
            </p>
            <p className="font-mono text-4xl font-bold tracking-tight md:text-5xl">
              {formatHolders(stats.holdersCount)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
