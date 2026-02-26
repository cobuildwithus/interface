import { getSubmissionsByRoundWithAiOutputs } from "@/lib/domains/rounds/submissions";
import { getIntentStatsByEntityId } from "@/lib/domains/token/intent-stats/intent-stats";
import { isAdminFor } from "@/lib/config/admins";
import { RoundSubmissionsClient } from "./round-submissions-client";
import type { RoundVariant } from "./types";

type RoundSubmissionsProps = {
  ruleId: number;
  roundId: string;
  admins: string[];
  userAddress: `0x${string}` | undefined;
  variant: RoundVariant;
};

export async function RoundSubmissions({
  ruleId,
  roundId,
  admins,
  userAddress,
  variant,
}: RoundSubmissionsProps) {
  const { submissions, roundEntityIds } = await getSubmissionsByRoundWithAiOutputs(roundId, ruleId);

  if (submissions.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-2xl border p-6 text-center">
        No submissions yet
      </div>
    );
  }

  const entityIds = submissions.map((s) => s.entityId);
  const intentStatsByEntityId = await getIntentStatsByEntityId({
    entityIds,
    roundEntityIds,
  });

  const isAdmin = isAdminFor(userAddress, admins);

  return (
    <RoundSubmissionsClient
      submissions={submissions}
      intentStatsByEntityId={intentStatsByEntityId}
      isAdmin={isAdmin}
      ruleId={ruleId}
      roundId={roundId}
      variant={variant}
    />
  );
}
