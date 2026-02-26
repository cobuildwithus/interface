import { Suspense } from "react";
import type { AiVerdict } from "@/lib/shared/ai-verdict";
import { AiVerdictPanel } from "./ai-verdict-panel";
import { SubmissionSidebarSkeleton } from "./submission-sidebar-skeleton";
import { SubmissionSidebarStats } from "./submission-sidebar-stats";

type SubmissionSidebarSimpleProps = {
  entityId: string;
  username?: string;
  beneficiaryAddress?: `0x${string}`;
  roundId: string;
  isAdmin?: boolean;
  aiVerdict?: AiVerdict | null;
  authorFid?: number;
  source?: "farcaster" | "x";
};

export function SubmissionSidebarSimple({
  entityId,
  username,
  beneficiaryAddress,
  roundId,
  isAdmin = false,
  aiVerdict = null,
  authorFid,
  source,
}: SubmissionSidebarSimpleProps) {
  return (
    <div className="flex flex-col lg:h-full">
      {isAdmin && aiVerdict ? <AiVerdictPanel aiVerdict={aiVerdict} /> : null}
      <Suspense fallback={<SubmissionSidebarSkeleton />}>
        <SubmissionSidebarStats
          entityId={entityId}
          roundId={roundId}
          username={username}
          beneficiaryAddress={beneficiaryAddress}
          authorFid={authorFid}
          source={source}
        />
      </Suspense>
    </div>
  );
}
