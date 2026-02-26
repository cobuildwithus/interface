import { Suspense } from "react";
import {
  BuildersListSkeleton,
  PeopleListSkeleton,
} from "@/components/common/skeletons/people-list-skeleton";
import { HoldersChartSkeleton } from "@/components/common/skeletons/holders-chart-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import { buildPageMetadata } from "@/lib/shared/page-metadata";
import { PeopleList } from "./people-list";
import { BuildersList } from "./builders-list";
import { HoldersChart } from "./holders-chart";
import { HoldersSortFilter } from "./holders-sort-filter";
import type { ParticipantSort } from "@/lib/domains/token/juicebox/participants";

export const metadata = buildPageMetadata({
  title: "People | Cobuild",
  description: "Builders and token holders participating in Cobuild.",
});

type PageProps = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function PeoplePage({ searchParams }: PageProps) {
  const { sort: sortParam } = await searchParams;
  const sort: ParticipantSort = sortParam === "top" ? "top" : "new";

  return (
    <main className="w-full p-4 md:p-6">
      <PageHeader title="People" description="Builders and token holders" />

      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold">Builders</h2>
        <Suspense fallback={<BuildersListSkeleton />}>
          <BuildersList />
        </Suspense>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Holders</h2>
          <HoldersSortFilter />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Suspense fallback={<HoldersChartSkeleton />}>
            <HoldersChart />
          </Suspense>
          <Suspense key={sort} fallback={<PeopleListSkeleton />}>
            <PeopleList sort={sort} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
