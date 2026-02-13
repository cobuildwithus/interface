"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Currency } from "@/components/ui/currency";
import { DateTime } from "@/components/ui/date-time";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import { getSubmissionHref } from "@/lib/domains/rounds/submission-routes";
import type { RoundSubmission } from "@/types/round-submission";

import { getSubmissionRewardAmount, sortRoundSubmissions } from "./submission-sorting";
import type { SortBy } from "./sort-filter";

type RoundSubmissionsMediaProps = {
  submissions: RoundSubmission[];
  intentStatsByEntityId: Record<string, IntentStats>;
  roundId: string;
};

/**
 * Media variant: masonry layout of image-first submissions.
 * - Keeps original aspect ratio
 * - Hides submissions without media
 * - Hover overlay reveals author + meta info
 */
export function RoundSubmissionsMedia({
  submissions,
  intentStatsByEntityId,
  roundId,
}: RoundSubmissionsMediaProps) {
  const searchParams = useSearchParams();
  const sortBy = (searchParams.get("sort") as SortBy) || "top";

  const mediaSubmissions = useMemo(
    () =>
      submissions.filter((submission) =>
        (submission.mediaUrls ?? []).some((url) => Boolean(url?.trim()))
      ),
    [submissions]
  );

  const sortedSubmissions = useMemo(() => {
    return sortRoundSubmissions(mediaSubmissions, sortBy, intentStatsByEntityId);
  }, [mediaSubmissions, sortBy, intentStatsByEntityId]);

  if (sortedSubmissions.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-2xl border p-6 text-center">
        No media submissions yet
      </div>
    );
  }

  return (
    <div className="columns-1 [column-gap:1rem] sm:columns-2 lg:columns-3">
      {sortedSubmissions.map((submission) => {
        const href = getSubmissionHref(roundId, submission);
        const coverUrl = (submission.mediaUrls ?? []).find((url) => Boolean(url?.trim())) ?? "";
        const ts = submission.createdAt ? new Date(submission.createdAt) : null;
        const rewardAmount = getSubmissionRewardAmount(submission, intentStatsByEntityId);

        return (
          <Link
            key={`${submission.source}:${submission.postId}`}
            href={href}
            className="mb-4 block break-inside-avoid"
          >
            <div className="bg-muted/20 group relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverUrl} alt="" loading="lazy" className="block h-auto w-full" />

              {/* Hover overlay with author + meta info */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-12 pb-3">
                  <div className="flex items-center gap-2">
                    <Avatar
                      size={24}
                      src={submission.avatarUrl}
                      alt={`@${submission.handle}`}
                      fallback={submission.handle.slice(0, 2).toUpperCase()}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-white/70">
                        <span className="truncate text-sm font-semibold text-white">
                          {submission.handle}
                        </span>
                        {ts && <DateTime date={ts} relative short />}
                      </div>
                    </div>
                    <Currency
                      value={rewardAmount}
                      className="text-xs font-semibold text-emerald-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
