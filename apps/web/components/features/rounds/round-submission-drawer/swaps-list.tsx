"use client";

import {
  Heart,
  MessageCircle,
  Repeat,
  Quote,
  UserPlus,
  DollarSign,
  Circle,
  UserX,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Currency } from "@/components/ui/currency";
import { NeynarScoreIndicator } from "@/components/ui/neynar-score-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfileClient } from "@/components/common/user-profile-client";
import { formatTokenAmount } from "@/lib/shared/currency/format";
import { isNeynarScoreIneligible } from "@/lib/domains/eligibility/constants";
import { cn } from "@/lib/shared/utils";
import type { CastIntentSwap } from "@/lib/domains/token/intent-swaps/intent-swaps.shared";

type SwapsListProps = {
  swaps: CastIntentSwap[];
  isLoading: boolean;
};

export function SwapsList({ swaps, isLoading }: SwapsListProps) {
  if (isLoading) {
    return <SwapsListSkeleton />;
  }

  if (!swaps || swaps.length === 0) {
    return <ZeroState message="No activity yet" />;
  }

  return (
    <div className="divide-border/60 flex flex-col divide-y rounded-lg">
      {swaps.map((swap) => (
        <div key={swap.id} className="flex items-center gap-2 px-2 py-2.5">
          <ReactionIcon reaction={swap.reaction} />
          <UserProfileClient
            address={swap.backerAddress}
            linkClassName="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
          >
            {({ profile, isLoading }) => (
              <>
                <Avatar size={18} src={profile.avatar} fallback={profile.name.slice(0, 2)} />
                <div className="flex min-w-0 items-center gap-1">
                  <span className="truncate text-xs">{profile.name}</span>
                  {!isLoading && isNeynarScoreIneligible(profile.farcaster.neynarUserScore) && (
                    <NeynarScoreIndicator />
                  )}
                </div>
              </>
            )}
          </UserProfileClient>
          <Currency value={swap.spendUsdc} className="shrink-0 text-xs" />
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {formatTokenAmount(swap.tokensBought)} {swap.tokenSymbol}
          </span>
        </div>
      ))}
    </div>
  );
}

function SwapsListSkeleton() {
  return (
    <div className="divide-border/60 flex flex-col divide-y rounded-lg">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-2.5">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="size-[18px] rounded-full" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="h-3 w-16" />
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

const REACTION_ICONS: Record<string, { icon: typeof Heart; color: string }> = {
  like: { icon: Heart, color: "text-pink-500" },
  comment: { icon: MessageCircle, color: "text-blue-500" },
  recast: { icon: Repeat, color: "text-emerald-500" },
  quote_cast: { icon: Quote, color: "text-amber-500" },
  follow: { icon: UserPlus, color: "text-violet-500" },
  direct_swap: { icon: DollarSign, color: "text-emerald-600" },
};

function ReactionIcon({ reaction }: { reaction: string | null }) {
  const config = reaction ? REACTION_ICONS[reaction] : null;
  const Icon = config?.icon ?? Circle;
  const color = config?.color ?? "text-muted-foreground";
  return <Icon className={cn("size-3", color)} />;
}
