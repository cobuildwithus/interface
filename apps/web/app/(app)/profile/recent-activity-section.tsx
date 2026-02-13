import Link from "next/link";
import { ArrowRightLeft, Wallet } from "lucide-react";
import { RecentActivityTable } from "@/components/features/token/recent-activity-table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSession } from "@/lib/domains/auth/session";
import { getRecentActivityByWallet } from "@/lib/domains/token/recent-activity";

export async function RecentActivitySection() {
  const session = await getSession();
  const address = session.address ?? null;

  if (!address) {
    return (
      <div className="border-border bg-card/50 overflow-hidden rounded-xl border">
        <div className="border-border/60 border-b px-4 py-4">
          <h3 className="text-lg font-medium">Recent micro-swaps</h3>
          <p className="text-muted-foreground mt-1 text-sm">Swaps from your social engagement</p>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <Wallet className="text-muted-foreground/40 mb-3 size-8" />
          <p className="text-muted-foreground mb-1 text-sm font-medium">No wallet connected</p>
          <p className="text-muted-foreground/70 mb-3 max-w-[240px] text-xs">
            Connect a wallet to see your micro-swap activity from social engagement.
          </p>
          <Link href="/settings" className="text-primary text-sm font-medium hover:underline">
            Connect wallet
          </Link>
        </div>
      </div>
    );
  }

  const items = await getRecentActivityByWallet(address, 25);

  return (
    <div className="border-border bg-card/50 overflow-hidden rounded-xl border">
      <div className="border-border/60 border-b px-4 py-4">
        <h3 className="text-lg font-medium">Recent micro-swaps</h3>
        <p className="text-muted-foreground mt-1 text-sm">Swaps from your social engagement</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
          <ArrowRightLeft className="text-muted-foreground/40 mb-3 size-8" />
          <p className="text-muted-foreground mb-1 text-sm font-medium">No activity yet</p>
          <p className="text-muted-foreground/70 mb-3 max-w-[240px] text-xs">
            Engage with posts and topics to earn micro-swaps automatically.
          </p>
          <Link href="/discussion" className="text-primary text-sm font-medium hover:underline">
            Browse discussions
          </Link>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="pb-4">
            <RecentActivityTable items={items} />
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
