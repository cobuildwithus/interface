import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import { calculateTotalReward } from "@/lib/domains/token/rewards";
import type { RoundSubmission } from "@/types/round-submission";
import type { SortBy } from "./sort-filter";

export function getSubmissionRewardAmount(
  submission: RoundSubmission,
  intentStatsByEntityId: Record<string, IntentStats>
): number {
  return calculateTotalReward(submission.evalScore, intentStatsByEntityId[submission.entityId]);
}

export function sortRoundSubmissions(
  submissions: RoundSubmission[],
  sortBy: SortBy,
  intentStatsByEntityId: Record<string, IntentStats>
): RoundSubmission[] {
  if (sortBy === "recent") {
    return [...submissions].sort(
      (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
  }

  return [...submissions].sort(
    (a, b) =>
      getSubmissionRewardAmount(b, intentStatsByEntityId) -
      getSubmissionRewardAmount(a, intentStatsByEntityId)
  );
}
