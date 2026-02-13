import { Badge } from "@/components/ui/badge";
import { Currency } from "@/components/ui/currency";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserProfile } from "@/components/common/user-profile";
import { getFarcasterProfileUrl } from "@/lib/integrations/farcaster/urls";
import { truncateAddress } from "@/lib/shared/utils";
import type { RecentActivityItem } from "@/lib/domains/token/recent-activity";
import type { Profile } from "@/lib/domains/profile/types";
import { Circle, DollarSign, Heart, MessageCircle, Quote, Repeat, UserPlus } from "lucide-react";

function formatTokenLabel(item: RecentActivityItem): string {
  if (item.tokenName) return item.tokenName;
  if (item.tokenSymbol) return `$${item.tokenSymbol}`;
  return truncateAddress(item.tokenAddress);
}

export function RecentActivityTable({ items }: { items: RecentActivityItem[] }) {
  return (
    <table className="w-full text-[13px]">
      <thead className="text-muted-foreground text-xs">
        <tr className="border-border/60 border-b">
          <th className="py-3 pl-4 text-left font-medium">Builder</th>
          <th className="py-3 pl-4 text-right font-medium">Coin</th>
          <th className="py-3 pl-4 text-right font-medium">Spent</th>
          <th className="py-3 pr-4 pl-4 text-right font-medium">Bought</th>
        </tr>
      </thead>
      <tbody className="divide-border/60 divide-y">
        {items.map((item) => (
          <tr key={item.id}>
            <td className="text-muted-foreground py-3 pl-4 text-left align-middle">
              <div className="flex items-center gap-2">
                <ReactionIcon reaction={item.reaction} />
                {item.creatorAddress ? (
                  <UserProfile address={item.creatorAddress} hideLink>
                    {({ profile }) => <BuilderCell profile={profile} />}
                  </UserProfile>
                ) : (
                  "—"
                )}
              </div>
            </td>
            <td className="max-w-[120px] truncate py-3 pl-4 text-right">
              {formatTokenLabel(item)}
            </td>
            <td className="py-3 pl-4 text-right tabular-nums">
              <Currency value={item.spendUsdc} kind="usd" />
            </td>
            <td className="py-3 pr-4 pl-4 text-right tabular-nums">
              {item.pending ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="cursor-help text-[10px] uppercase">
                      Pending
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Waiting for lower gas</TooltipContent>
                </Tooltip>
              ) : (
                <Currency value={item.tokensBought} kind="token" />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReactionIcon({ reaction }: { reaction: RecentActivityItem["reaction"] }) {
  switch (reaction) {
    case "like":
      return <Heart className="size-4 text-pink-500" aria-label="Like" />;
    case "comment":
      return <MessageCircle className="size-4 text-blue-500" aria-label="Comment" />;
    case "recast":
      return <Repeat className="size-4 text-emerald-500" aria-label="Recast" />;
    case "quote_cast":
      return <Quote className="size-4 text-amber-500" aria-label="Quote" />;
    case "follow":
      return <UserPlus className="size-4 text-violet-500" aria-label="Follow" />;
    case "direct_swap":
      return <DollarSign className="size-4 text-emerald-600" aria-label="Direct swap" />;
    default:
      return <Circle className="text-muted-foreground size-4" aria-label="Activity" />;
  }
}

function BuilderCell({ profile }: { profile: Profile }) {
  const profileUrl = profile.farcaster.name ? getFarcasterProfileUrl(profile.farcaster.name) : null;

  const inner = (
    <>
      <span className="shrink-0">
        <Avatar size={22} src={profile.avatar} fallback={profile.name} />
      </span>
      <span className="truncate">{profile.name}</span>
    </>
  );

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 items-center gap-2 hover:underline"
      >
        {inner}
      </a>
    );
  }

  return <span className="flex min-w-0 items-center gap-2">{inner}</span>;
}
