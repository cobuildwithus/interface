"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Currency } from "@/components/ui/currency";
import { cn } from "@/lib/shared/utils";
import type { RoundSubmission } from "@/types/round-submission";
import { getSubmissionHref } from "@/lib/domains/rounds/submission-routes";
import { truncateWords } from "@/lib/shared/text/truncate-words";

type IdeaRowProps = {
  submission: RoundSubmission;
  rewardAmount: number;
  roundId: string;
  className?: string;
};

export function IdeaRow({ submission, rewardAmount, roundId, className }: IdeaRowProps) {
  const handle = submission.handle;
  const avatarUrl = submission.avatarUrl;
  const displayName = submission.displayName;
  const displayText = truncateWords(submission.summaryText, 6);
  const href = getSubmissionHref(roundId, submission);

  return (
    <Link
      href={href}
      className={cn(
        "group flex w-full items-center gap-4 py-3 pr-4 pl-6 text-left",
        "hover:bg-muted/50 rounded transition-colors",
        "focus-visible:bg-muted/50 focus-visible:outline-none",
        className
      )}
    >
      <Avatar
        size={30}
        src={avatarUrl}
        alt={displayName}
        fallback={handle.slice(0, 2).toUpperCase()}
      />

      <span className="text-foreground/80 group-hover:text-foreground min-w-0 flex-1 text-base transition-colors">
        {displayText}
      </span>

      <Currency value={rewardAmount} className="shrink-0 text-base text-emerald-500 tabular-nums" />
    </Link>
  );
}
