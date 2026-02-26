"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { DateTime } from "@/components/ui/date-time";
import { Currency } from "@/components/ui/currency";
import { cn } from "@/lib/shared/utils";
import type { RoundSubmission } from "@/types/round-submission";
import { getSubmissionHref } from "@/lib/domains/rounds/submission-routes";

type SubmissionCardProps = {
  submission: RoundSubmission;
  roundId: string;
  topRightAmount?: number;
  className?: string;
};

export function SubmissionCard({
  submission,
  roundId,
  topRightAmount,
  className,
}: SubmissionCardProps) {
  const ts = submission.createdAt ? new Date(submission.createdAt) : null;
  const handle = submission.handle;
  const displayName = submission.displayName;
  const showHandle =
    Boolean(handle) && (!displayName || displayName.toLowerCase() !== `@${handle}`.toLowerCase());
  const primaryName = displayName || `@${handle}`;
  const avatarUrl = submission.avatarUrl;
  const text = submission.displayText ?? submission.rawText ?? "";
  const href = getSubmissionHref(roundId, submission);

  return (
    <Link
      href={href}
      className={cn(
        "border-border hover:bg-accent/50 block w-full cursor-pointer border-b px-4 py-3.5 transition-colors last:border-b-0",
        className
      )}
    >
      {topRightAmount != null && (
        <Currency
          value={topRightAmount}
          className="float-right text-sm font-semibold text-emerald-500"
        />
      )}
      <div className="flex items-start gap-3">
        <Avatar
          size={40}
          src={avatarUrl}
          alt={primaryName}
          fallback={handle.slice(0, 2).toUpperCase()}
        />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-foreground font-content truncate text-base font-semibold">
              {primaryName}
            </span>
            {showHandle && displayName && (
              <span className="text-muted-foreground truncate text-sm">@{handle}</span>
            )}
            {ts && (
              <DateTime
                date={ts}
                relative
                short
                className="text-muted-foreground shrink-0 text-sm whitespace-nowrap"
              />
            )}
          </div>
          <p className="text-foreground/90 font-content line-clamp-6 text-base leading-normal">
            {text}
          </p>
        </div>
      </div>
    </Link>
  );
}
