import { Avatar } from "@/components/ui/avatar";
import { DateTime } from "@/components/ui/date-time";
import { Currency } from "@/components/ui/currency";
import { toFiniteNumber } from "@/lib/shared/numbers";
import { getPayEvents } from "@/lib/domains/token/juicebox/pay-events";
import { getProfiles } from "@/lib/domains/profile/get-profile";

function toTokenAmount(
  raw: string | number | bigint | null | undefined,
  decimals: number
): number | null {
  const baseUnits = toFiniteNumber(raw);
  if (baseUnits === null) return null;
  const tokens = baseUnits / Math.pow(10, decimals);
  return Number.isFinite(tokens) ? tokens : null;
}

export async function RecentContributions() {
  const page = await getPayEvents(4, 0);

  if (page.items.length === 0) {
    return (
      <div className="text-muted-foreground py-4 text-center text-sm">No contributions yet</div>
    );
  }

  const profiles = await getProfiles(page.items.map((p) => p.payer));

  return (
    <div className="divide-border divide-y">
      {page.items.map((event, i) => {
        const profile = profiles[i]!;
        const accountingDecimals = event.project.accountingDecimals ?? 18;
        const paymentAmount = toTokenAmount(event.amount, accountingDecimals);
        const paymentSymbol = event.project.accountingTokenSymbol;
        const timestamp = new Date(event.timestamp * 1000);

        return (
          <div key={`${event.txHash}-${i}`} className="flex items-center gap-3 py-2">
            <Avatar size={32} src={profile.avatar} fallback={event.payer} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile.name}</div>
              <div className="text-muted-foreground text-xs">
                <Currency value={paymentAmount ?? 0} kind="token" /> {paymentSymbol}
              </div>
            </div>
            <DateTime date={timestamp} relative short className="text-muted-foreground text-xs" />
          </div>
        );
      })}
    </div>
  );
}
