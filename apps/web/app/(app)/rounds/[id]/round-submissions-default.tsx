"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { SubmissionCard } from "@/components/features/rounds/submission-card";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import type { RoundSubmission } from "@/types/round-submission";

import type { SortBy } from "./sort-filter";
import { getSubmissionRewardAmount, sortRoundSubmissions } from "./submission-sorting";

type RoundSubmissionsDefaultProps = {
  submissions: RoundSubmission[];
  intentStatsByEntityId: Record<string, IntentStats>;
  roundId: string;
};

/**
 * Default variant: card-based layout with sorting support.
 */
export function RoundSubmissionsDefault({
  submissions,
  intentStatsByEntityId,
  roundId,
}: RoundSubmissionsDefaultProps) {
  const searchParams = useSearchParams();
  const sortBy = (searchParams.get("sort") as SortBy) || "top";

  const sortedSubmissions = useMemo(() => {
    return sortRoundSubmissions(submissions, sortBy, intentStatsByEntityId);
  }, [submissions, sortBy, intentStatsByEntityId]);

  const getAmount = (submission: RoundSubmission): number =>
    getSubmissionRewardAmount(submission, intentStatsByEntityId);

  return (
    <div className="border-border divide-border max-w-[600px] divide-y overflow-hidden rounded-xl border">
      {sortedSubmissions.map((submission) => (
        <SubmissionCard
          key={`${submission.source}:${submission.postId}`}
          submission={submission}
          roundId={roundId}
          topRightAmount={getAmount(submission)}
        />
      ))}
    </div>
  );
}
