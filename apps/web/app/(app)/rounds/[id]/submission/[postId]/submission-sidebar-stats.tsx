import { getIntentStatsByEntityId } from "@/lib/domains/token/intent-stats/intent-stats";
import { getRoundEntityIds } from "@/lib/domains/rounds/submissions";
import { getSwapsByEntityId } from "@/lib/domains/token/intent-swaps/intent-swaps";
import { EntitySubmissionStats } from "@/components/features/rounds/submission/entity-submission-stats";

type SubmissionSidebarStatsProps = {
  entityId: string;
  roundId: string;
  username?: string;
  beneficiaryAddress?: `0x${string}`;
  authorFid?: number;
  source?: "farcaster" | "x";
};

export async function SubmissionSidebarStats({
  entityId,
  roundId,
  username,
  beneficiaryAddress,
  authorFid,
  source,
}: SubmissionSidebarStatsProps) {
  const [roundEntityIds, swaps] = await Promise.all([
    getRoundEntityIds(roundId),
    getSwapsByEntityId(entityId),
  ]);
  const intentStatsByEntityId = await getIntentStatsByEntityId({
    entityIds: [entityId],
    roundEntityIds,
  });
  const intentStats = intentStatsByEntityId[entityId] ?? null;

  return (
    <EntitySubmissionStats
      entityId={entityId}
      username={username}
      beneficiaryAddress={beneficiaryAddress}
      authorFid={authorFid}
      source={source}
      evalScore={null}
      intentStats={intentStats}
      swaps={swaps}
      variant="sidebar"
    />
  );
}
