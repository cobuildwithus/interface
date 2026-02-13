import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { DiscussionList } from "@/components/features/social/discussion/discussion-list";
import { DiscussionListSkeleton } from "@/components/common/skeletons/discussion-list-skeleton";
import { resolveDiscussionParams } from "@/components/features/social/discussion/discussion-params";
import { buildPageMetadata } from "@/lib/shared/page-metadata";

export const metadata = buildPageMetadata({
  title: "Discussion | Cobuild",
  description: "Dive into the conversation to steer the future of Cobuild.",
});

type PageProps = {
  searchParams: Promise<{ page?: string; sort?: string; dir?: string }>;
};

export default async function DiscussionPage({ searchParams }: PageProps) {
  const { page, sort, sortDirection } = resolveDiscussionParams(await searchParams);

  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader
        title="Discussion"
        description="Dive into the conversation to steer the future of Cobuild"
      />

      <Suspense key={`${page}-${sort}-${sortDirection}`} fallback={<DiscussionListSkeleton />}>
        <DiscussionList page={page} sort={sort} sortDirection={sortDirection} />
      </Suspense>
    </main>
  );
}
