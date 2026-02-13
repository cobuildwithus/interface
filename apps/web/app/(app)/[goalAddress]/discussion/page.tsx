import { Suspense } from "react";
import type { Metadata } from "next";
import { GridBackground } from "@/components/ui/grid-background";
import { PageHeader } from "@/components/layout/page-header";
import { DiscussionList } from "@/components/features/social/discussion/discussion-list";
import { DiscussionListSkeleton } from "@/components/common/skeletons/discussion-list-skeleton";
import { resolveDiscussionParams } from "@/components/features/social/discussion/discussion-params";
import { RAISE_1M_GOAL_SCOPE, buildCreatePostHref } from "@/lib/domains/goals/goal-scopes";
import { generateGoalMetadata } from "../metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateGoalMetadata({
    pageName: "Discussion",
    description:
      "Coordinate with builders and contributors working toward the Raise $1M by June 30, 2026 goal.",
    pathSuffix: "/discussion",
  });
}

type PageProps = {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
};

export default async function Raise1MilDiscussionPage({ searchParams }: PageProps) {
  const { page, sort, sortDirection } = resolveDiscussionParams(await searchParams);
  const createPostHref = buildCreatePostHref(RAISE_1M_GOAL_SCOPE);

  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative w-full p-4 md:p-6">
        <PageHeader
          title="Discussion"
          description="Coordinate with builders and contributors working toward the Raise $1M by June 30, 2026 goal."
        />

        <Suspense key={`${page}-${sort}-${sortDirection}`} fallback={<DiscussionListSkeleton />}>
          <DiscussionList
            page={page}
            sort={sort}
            sortDirection={sortDirection}
            embedUrl={RAISE_1M_GOAL_SCOPE.url}
            createPostHref={createPostHref}
          />
        </Suspense>
      </div>
    </main>
  );
}
