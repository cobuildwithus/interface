import type { RoundSubmission } from "@/types/round-submission";

export function getSubmissionHref(roundId: string, submission: RoundSubmission): string {
  return `/rounds/${roundId}/submission/${submission.postId}`;
}
