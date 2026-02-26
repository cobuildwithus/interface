import { Suspense } from "react";
import type { Metadata } from "next";
import {
  BuildersListSkeleton,
  PeopleListSkeleton,
} from "@/components/common/skeletons/people-list-skeleton";
import { GridBackground } from "@/components/ui/grid-background";
import { BuildersList } from "../../people/builders-list";
import { PeopleList } from "../../people/people-list";
import { generateGoalMetadata } from "../metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateGoalMetadata({
    pageName: "Builders",
    description:
      "Meet the builders and funders contributing to the Raise $1M by June 30, 2026 goal.",
    pathSuffix: "/builders",
  });
}

export default function BuildersPage() {
  return (
    <main className="relative min-h-screen w-full">
      <GridBackground />
      <div className="relative w-full p-4 md:p-6">
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">Builders</h2>
          <Suspense fallback={<BuildersListSkeleton />}>
            <BuildersList />
          </Suspense>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Funders</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Suspense fallback={<PeopleListSkeleton />}>
              <PeopleList />
            </Suspense>
          </div>
        </section>
      </div>
    </main>
  );
}
