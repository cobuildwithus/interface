import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GridBackground } from "@/components/ui/grid-background";
import { PageHeader } from "@/components/layout/page-header";
import { DiscussionList } from "@/components/features/social/discussion/discussion-list";
import { DiscussionListSkeleton } from "@/components/common/skeletons/discussion-list-skeleton";
import { resolveDiscussionParams } from "@/components/features/social/discussion/discussion-params";
import { buildCreatePostHref } from "@/lib/domains/goals/goal-scopes";
import { getGoalOverviewData } from "@/lib/domains/goals/goal-data";
import { generateGoalMetadata } from "../metadata";

type MetadataProps = {
  params: Promise<{ goalAddress: string }>;
};

export async function generateMetadata({ params }: MetadataProps): Promise<Metadata> {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  const description =
    overview?.goal.description ??
    `Coordinate with builders and contributors working toward ${overview?.progressTitle ?? "this goal"}.`;

  return generateGoalMetadata({
    goalAddress,
    pageName: "Discussion",
    description,
    pathSuffix: "/discussion",
  });
}

type PageProps = {
  params: Promise<{ goalAddress: string }>;
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
};

export default async function GoalDiscussionPage({ params, searchParams }: PageProps) {
  const { goalAddress } = await params;
  const overview = await getGoalOverviewData(goalAddress);
  if (!overview) notFound();

  const { page, sort, sortDirection } = resolveDiscussionParams(await searchParams);
  const createPostHref = buildCreatePostHref(overview.goalScope);

  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative w-full p-4 md:p-6">
        <PageHeader
          title="Discussion"
          description={`Coordinate with builders and contributors working toward ${overview.progressTitle}.`}
        />

        <Suspense key={`${page}-${sort}-${sortDirection}`} fallback={<DiscussionListSkeleton />}>
          <DiscussionList
            page={page}
            sort={sort}
            sortDirection={sortDirection}
            embedUrl={overview.goalScope.url}
            createPostHref={createPostHref}
          />
        </Suspense>
      </div>
    </main>
  );
}
