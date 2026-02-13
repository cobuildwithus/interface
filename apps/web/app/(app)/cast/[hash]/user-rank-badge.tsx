import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { computeRankTier, toSafeCount } from "@/lib/domains/profile/rank";
import { pluralize } from "@/lib/shared/text/pluralize";
import { RankBadgeIcons } from "@/components/common/rank-badges";

type UserRankBadgeProps = {
  neynarScore: number | null | undefined;
  activity: number | null | undefined;
  posts: number | null | undefined;
};

export function UserRankBadge({ neynarScore, activity, posts }: UserRankBadgeProps) {
  const baseActivity = toSafeCount(activity);
  const postCount = toSafeCount(posts);
  const tier = computeRankTier(activity, neynarScore);
  const approxWeeks = baseActivity > 0 ? Math.ceil(baseActivity / 14) * 2 : 0;
  const weekLabel = pluralize(approxWeeks, "week");
  const postLabel = pluralize(postCount, "post");

  return (
    <div className="flex flex-col items-start text-left">
      <span className="text-muted-foreground text-xs">{tier.name}</span>

      <RankBadgeIcons count={tier.badges} className="mt-0.5 flex" />

      <Tooltip>
        <TooltipTrigger className="text-muted-foreground mt-6 cursor-help text-xs">
          Activity: {baseActivity}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          Active ~{approxWeeks} {weekLabel}, {postCount} {postLabel}. Activity = min(posts, 2 wk
          active periods x 14).
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
