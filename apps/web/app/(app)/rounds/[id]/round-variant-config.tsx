import type { ComponentType, ReactElement } from "react";

import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import type { RoundVariant } from "@/lib/domains/rounds/config";
import type { RoundSubmission } from "@/types/round-submission";
import {
  IdeasSkeletonList,
  MediaSkeletonGrid,
  PostCardSkeletonList,
} from "@/components/features/rounds/post-card-skeleton";

import { IdeasViewFilter } from "./ideas-view-filter";
import { SortFilter } from "./sort-filter";
import { RoundSubmissionsDefault } from "./round-submissions-default";
import { RoundSubmissionsIdeas } from "./round-submissions-ideas";
import { RoundSubmissionsMedia } from "./round-submissions-media";

type RoundSubmissionsRendererProps = {
  submissions: RoundSubmission[];
  intentStatsByEntityId: Record<string, IntentStats>;
  isAdmin: boolean;
  ruleId: number;
  roundId: string;
};

type RoundVariantConfig = {
  Filter: ComponentType;
  Skeleton: ComponentType;
  renderSubmissions: (props: RoundSubmissionsRendererProps) => ReactElement;
};

// Centralized variant registry to keep round UI behavior consistent.
export const ROUND_VARIANT_CONFIG: Record<RoundVariant, RoundVariantConfig> = {
  default: {
    Filter: SortFilter,
    Skeleton: PostCardSkeletonList,
    renderSubmissions: ({ submissions, intentStatsByEntityId, roundId }) => (
      <RoundSubmissionsDefault
        submissions={submissions}
        intentStatsByEntityId={intentStatsByEntityId}
        roundId={roundId}
      />
    ),
  },
  ideas: {
    Filter: IdeasViewFilter,
    Skeleton: IdeasSkeletonList,
    renderSubmissions: ({ submissions, intentStatsByEntityId, roundId }) => (
      <RoundSubmissionsIdeas
        submissions={submissions}
        intentStatsByEntityId={intentStatsByEntityId}
        roundId={roundId}
      />
    ),
  },
  media: {
    Filter: SortFilter,
    Skeleton: MediaSkeletonGrid,
    renderSubmissions: ({ submissions, intentStatsByEntityId, roundId }) => (
      <RoundSubmissionsMedia
        submissions={submissions}
        intentStatsByEntityId={intentStatsByEntityId}
        roundId={roundId}
      />
    ),
  },
};

export function getRoundVariantConfig(variant: RoundVariant | null | undefined) {
  return ROUND_VARIANT_CONFIG[variant ?? "default"] ?? ROUND_VARIANT_CONFIG.default;
}

export type { RoundSubmissionsRendererProps };
