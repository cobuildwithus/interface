"use client";

import { UserX } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Currency } from "@/components/ui/currency";
import { NeynarScoreIndicator } from "@/components/ui/neynar-score-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfileClient } from "@/components/common/user-profile-client";
import { isNeynarScoreIneligible } from "@/lib/domains/eligibility/constants";
import type { CastBacker } from "@/lib/domains/token/intent-swaps/intent-swaps.shared";

type BackersListProps = {
  backers: CastBacker[];
  isLoading: boolean;
};

export function BackersList({ backers, isLoading }: BackersListProps) {
  if (isLoading) {
    return <BackersListSkeleton />;
  }

  if (!backers || backers.length === 0) {
    return <ZeroState message="No backers yet" />;
  }

  return (
    <div className="divide-border/60 flex flex-col divide-y rounded-lg">
      {backers.map((backer) => (
        <div key={backer.address} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <UserProfileClient
            address={backer.address}
            linkClassName="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
          >
            {({ profile, isLoading }) => (
              <>
                <Avatar size={28} src={profile.avatar} fallback={profile.name.slice(0, 2)} />
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-sm font-medium">{profile.name}</span>
                  {!isLoading && isNeynarScoreIneligible(profile.farcaster.neynarUserScore) && (
                    <NeynarScoreIndicator />
                  )}
                </div>
              </>
            )}
          </UserProfileClient>
          <Currency value={backer.totalSpend} className="shrink-0 text-sm font-semibold" />
        </div>
      ))}
    </div>
  );
}

function BackersListSkeleton() {
  return (
    <div className="divide-border/60 flex flex-col divide-y rounded-lg">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

function ZeroState({ message }: { message: string }) {
  return (
    <div className="flex h-[122px] flex-col items-center justify-center">
      <UserX className="text-muted-foreground size-6" />
      <div className="text-muted-foreground text-sm">{message}</div>
    </div>
  );
}
