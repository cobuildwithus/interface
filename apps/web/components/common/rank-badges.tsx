import Image from "next/image";
import { type RankTier } from "@/lib/domains/profile/rank";
import { cn } from "@/lib/shared/utils";

type RankBadgesProps = {
  tier: RankTier;
  className?: string;
};

type RankBadgeIconsProps = {
  count: number;
  className?: string;
};

export function RankBadgeIcons({ count, className }: RankBadgeIconsProps) {
  if (count <= 0) return null;

  return (
    <span className={cn("inline-flex gap-0.5", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="inline-flex">
          <Image
            src="/logo-light.svg"
            alt=""
            width={12}
            height={12}
            className="h-3 w-3 opacity-80 grayscale saturate-0 dark:hidden"
          />
          <Image
            src="/logo-dark.svg"
            alt=""
            width={12}
            height={12}
            className="hidden h-3 w-3 opacity-80 grayscale saturate-0 dark:block"
          />
        </span>
      ))}
    </span>
  );
}

export function RankBadges({ tier, className }: RankBadgesProps) {
  return (
    <div className={className}>
      <span className="text-muted-foreground text-sm">{tier.name}</span>
      <RankBadgeIcons count={tier.badges} className="ml-1.5 align-middle" />
    </div>
  );
}
