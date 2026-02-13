"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { IntentStats } from "@/lib/domains/token/intent-stats/intent-stats";
import { cn } from "@/lib/shared/utils";
import { IdeaRow } from "./idea-row";
import type { IdeasView } from "./ideas-view-filter";
import type { RoundSubmission } from "@/types/round-submission";
import { getSubmissionRewardAmount } from "./submission-sorting";

type RoundSubmissionsIdeasProps = {
  submissions: RoundSubmission[];
  intentStatsByEntityId: Record<string, IntentStats>;
  roundId: string;
};

type CategoryGroup = {
  category: string;
  submissions: RoundSubmission[];
};

const OTHER_CATEGORY = "Others";

/**
 * Groups submissions by aiCategory, sorting categories by total reward descending.
 * Null/empty categories go into "Others" at the end.
 */
function groupByCategory(
  submissions: RoundSubmission[],
  intentStatsByEntityId: Record<string, IntentStats>
): CategoryGroup[] {
  const categoryMap = new Map<string, RoundSubmission[]>();

  for (const submission of submissions) {
    const category = submission.aiCategory?.trim() || OTHER_CATEGORY;
    const existing = categoryMap.get(category) ?? [];
    existing.push(submission);
    categoryMap.set(category, existing);
  }

  // Sort submissions within each category by reward
  for (const [category, subs] of categoryMap) {
    subs.sort(
      (a, b) =>
        getSubmissionRewardAmount(b, intentStatsByEntityId) -
        getSubmissionRewardAmount(a, intentStatsByEntityId)
    );
    categoryMap.set(category, subs);
  }

  // Convert to array and sort categories by total reward (Others always last)
  const groups: CategoryGroup[] = [];
  let othersGroup: CategoryGroup | null = null;

  for (const [category, subs] of categoryMap) {
    if (category === OTHER_CATEGORY) {
      othersGroup = { category, submissions: subs };
    } else {
      groups.push({ category, submissions: subs });
    }
  }

  // Sort categories by total reward of their submissions
  groups.sort((a, b) => {
    const totalA = a.submissions.reduce(
      (sum, s) => sum + getSubmissionRewardAmount(s, intentStatsByEntityId),
      0
    );
    const totalB = b.submissions.reduce(
      (sum, s) => sum + getSubmissionRewardAmount(s, intentStatsByEntityId),
      0
    );
    return totalB - totalA;
  });

  // Add Others at the end if it exists
  if (othersGroup) {
    groups.push(othersGroup);
  }

  return groups;
}

/**
 * Sorts submissions by reward amount (top) or date (recent).
 */
function sortSubmissions(
  submissions: RoundSubmission[],
  view: "top" | "recent",
  intentStatsByEntityId: Record<string, IntentStats>
): RoundSubmission[] {
  if (view === "recent") {
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

export function RoundSubmissionsIdeas({
  submissions,
  intentStatsByEntityId,
  roundId,
}: RoundSubmissionsIdeasProps) {
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as IdeasView) || "all";

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  const categoryGroups = useMemo(
    () => groupByCategory(submissions, intentStatsByEntityId),
    [submissions, intentStatsByEntityId]
  );

  const flatSortedSubmissions = useMemo(() => {
    if (view === "all") {
      // For "all" view with few submissions, sort by reward
      return sortSubmissions(submissions, "top", intentStatsByEntityId);
    }
    return sortSubmissions(submissions, view, intentStatsByEntityId);
  }, [submissions, view, intentStatsByEntityId]);

  // Hide categories for "all" view when there are 10 or fewer submissions
  const showCategories = view === "all" && submissions.length > 10;

  // Flat list view (Top, Recent, or All with few submissions)
  if (view === "top" || view === "recent" || !showCategories) {
    return (
      <div className="min-w-0">
        {flatSortedSubmissions.map((submission) => (
          <IdeaRow
            key={`${submission.source}:${submission.postId}`}
            submission={submission}
            rewardAmount={getSubmissionRewardAmount(submission, intentStatsByEntityId)}
            roundId={roundId}
          />
        ))}
      </div>
    );
  }

  // Category-grouped view (only for "all" with > 10 submissions)
  return (
    <div className="min-w-0">
      {categoryGroups.map((group, groupIndex) => {
        const isCollapsed = collapsedCategories.has(group.category);

        return (
          <div key={group.category} className={cn(groupIndex > 0 && "mt-1")}>
            <button
              type="button"
              onClick={() => toggleCategory(group.category)}
              className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-1.5 rounded py-1.5 pr-3 pl-1 text-left transition-colors"
            >
              <ChevronRight
                className={cn(
                  "text-muted-foreground size-3.5 transition-transform",
                  !isCollapsed && "rotate-90"
                )}
              />
              <span className="text-muted-foreground text-sm font-medium">{group.category}</span>
              <span className="text-muted-foreground/60 text-sm">{group.submissions.length}</span>
            </button>

            {!isCollapsed && (
              <div>
                {group.submissions.map((submission) => (
                  <IdeaRow
                    key={`${submission.source}:${submission.postId}`}
                    submission={submission}
                    rewardAmount={getSubmissionRewardAmount(submission, intentStatsByEntityId)}
                    roundId={roundId}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
